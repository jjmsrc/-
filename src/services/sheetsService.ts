/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GlossaryItem } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google OAuth Provider with Sheets & Drive File scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedSpreadsheetId: string | null = null;
let cachedGlossarySheetId: number | null = null;
let cachedQuizLogsSheetId: number | null = null;

const SPREADSHEET_NAME = '사내 용어·약어 사전 - 데이터 저장소';

/**
 * Initialize Auth listener
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      cachedSpreadsheetId = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Google Sign In Flow
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google Auth에서 액세스 토큰을 가져오지 못했습니다.');
    }

    cachedAccessToken = credential.accessToken;
    // Pre-fetch/initialize spreadsheet
    try {
      await getOrCreateSpreadsheet(cachedAccessToken);
    } catch (err) {
      console.error('스프레드시트 자동 연동 실패:', err);
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('로그인 에러:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign Out
 */
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedSpreadsheetId = null;
  cachedGlossarySheetId = null;
  cachedQuizLogsSheetId = null;
  localStorage.removeItem('saved_spreadsheet_id');
};

/**
 * Retrieve cached or active Access Token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Get current Google User
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Fetch files or metadata from Google APIs
 */
async function apiFetch(url: string, options: RequestInit = {}) {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('인증 토큰이 없습니다. 다시 로그인해 주세요.');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    console.error(`API Fetch Error [${url}]:`, errText);
    throw new Error(`Google API 오류: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if a spreadsheet is accessible and load its sheet IDs
 */
async function loadSheetMetadata(spreadsheetId: string, token: string): Promise<boolean> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return false;

    const data = await response.json();
    const glossarySheet = data.sheets?.find((s: any) => s.properties.title === 'Glossary');
    const quizLogsSheet = data.sheets?.find((s: any) => s.properties.title === 'QuizLogs');

    if (glossarySheet) cachedGlossarySheetId = glossarySheet.properties.sheetId;
    if (quizLogsSheet) cachedQuizLogsSheetId = quizLogsSheet.properties.sheetId;

    return true;
  } catch {
    return false;
  }
}

/**
 * Main routine to fetch or create the corporate terminology Google Sheet
 */
export async function getOrCreateSpreadsheet(token: string): Promise<string> {
  if (cachedSpreadsheetId) {
    return cachedSpreadsheetId;
  }

  // Try loading from localStorage
  const localId = localStorage.getItem('saved_spreadsheet_id');
  if (localId) {
    const isValid = await loadSheetMetadata(localId, token);
    if (isValid) {
      cachedSpreadsheetId = localId;
      return localId;
    }
  }

  // Search Drive for file name
  const query = encodeURIComponent(`name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  
  const searchResult = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (searchResult.ok) {
    const data = await searchResult.json();
    if (data.files && data.files.length > 0) {
      const fileId = data.files[0].id;
      const isValid = await loadSheetMetadata(fileId, token);
      if (isValid) {
        cachedSpreadsheetId = fileId;
        localStorage.setItem('saved_spreadsheet_id', fileId);
        return fileId;
      }
    }
  }

  // If not found, CREATE the sheet
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const createBody = {
    properties: {
      title: SPREADSHEET_NAME
    },
    sheets: [
      { properties: { title: 'Glossary' } },
      { properties: { title: 'QuizLogs' } }
    ]
  };

  const createResult = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createBody)
  });

  if (!createResult.ok) {
    throw new Error('사내 구글 스프레드시트 데이터 저장소 생성에 실패했습니다.');
  }

  const createdData = await createResult.json();
  const newSpreadsheetId = createdData.spreadsheetId;

  // Extract sheet IDs
  const gSheet = createdData.sheets?.find((s: any) => s.properties.title === 'Glossary');
  const qSheet = createdData.sheets?.find((s: any) => s.properties.title === 'QuizLogs');
  if (gSheet) cachedGlossarySheetId = gSheet.properties.sheetId;
  if (qSheet) cachedQuizLogsSheetId = qSheet.properties.sheetId;

  cachedSpreadsheetId = newSpreadsheetId;
  localStorage.setItem('saved_spreadsheet_id', newSpreadsheetId);

  // Seed Initial Data (Header & Sample Terms)
  await seedInitialData(newSpreadsheetId, token);

  return newSpreadsheetId;
}

/**
 * Seeds initial mock data for first-time setup
 */
async function seedInitialData(spreadsheetId: string, token: string) {
  const seedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Glossary!A1:H6?valueInputOption=USER_ENTERED`;
  const values = [
    ['ID', 'Term', 'Abbreviation', 'Definition', 'Departments', 'Related_Terms', 'Last_Updated', 'Updated_By'],
    ['101', '제품 요구사항 정의서', 'PRD (Product Requirement Document)', '제품을 개발하기 위해 필요한 기능적, 비기능적 요구사항을 상세히 정의한 기획 문서입니다.', '기획, 개발, 디자인', '', '2026-07-14 12:00:00', '시스템 관리자'],
    ['102', '지속적 통합 및 배포', 'CI/CD (Continuous Integration / Continuous Deployment)', '개발자가 수정한 소스 코드를 자동으로 빌드, 테스트하고 배포 파이프라인을 통해 상용 서버에 반영하는 자동화 체계입니다.', '개발, QA', '101', '2026-07-14 13:00:00', '시스템 관리자'],
    ['103', '핵심 성과 지표', 'KPI (Key Performance Indicator)', '개인이나 조직의 비즈니스 목표 달성 정도를 정량적으로 측정하기 위해 설정하는 핵심 기준 지표입니다.', '인사, 기획, 영업, 마케팅', '', '2026-07-14 14:00:00', '시스템 관리자'],
    ['104', '목표 및 핵심 결과', 'OKR (Objectives and Key Results)', '조직이 도전적인 목표(Objectives)를 설정하고, 이를 달성하기 위한 구체적이고 측정 가능한 결과(Key Results)를 정의하여 정렬하는 성과 관리 프레임워크입니다.', '기획, 인사', '103', '2026-07-14 15:00:00', '시스템 관리자'],
    ['105', '품질 보증', 'QA (Quality Assurance)', '제품이 릴리즈되기 전에 기능적 결함이나 사용성 문제를 검증하여 일정한 품질 기준을 만족하는지 보증하는 프로세스 또는 담당 부서입니다.', 'QA, 개발', '102', '2026-07-14 16:00:00', '시스템 관리자']
  ];

  await fetch(seedUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });

  // Seed Quiz Logs header
  const logsSeedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/QuizLogs!A1:F1?valueInputOption=USER_ENTERED`;
  await fetch(logsSeedUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: [['Timestamp', 'User_Name', 'User_Email', 'Score', 'Total_Questions', 'Answers_Correct']] })
  });
}

/**
 * Load Glossary from spreadsheet
 */
export async function loadGlossary(): Promise<GlossaryItem[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const spreadsheetId = await getOrCreateSpreadsheet(token);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Glossary!A:H`;
  const data = await apiFetch(url);

  if (!data.values || data.values.length <= 1) {
    return [];
  }

  const rows = data.values.slice(1); // Skip Header
  return rows.map((row: any) => {
    return {
      id: parseInt(row[0] || '0', 10),
      term: row[1] || '',
      abbreviation: row[2] || '',
      definition: row[3] || '',
      departments: row[4] ? row[4].split(',').map((d: string) => d.trim()).filter(Boolean) : [],
      relatedTerms: row[5] ? row[5].split(',').map((id: string) => parseInt(id.trim(), 10)).filter((id: number) => !isNaN(id)) : [],
      lastUpdated: row[6] || '',
      updatedBy: row[7] || '',
    };
  });
}

/**
 * Add an item to the glossary
 */
export async function addGlossaryItem(item: Omit<GlossaryItem, 'id'>): Promise<GlossaryItem> {
  const token = await getAccessToken();
  if (!token) throw new Error('인증 토큰이 만료되었습니다. 다시 로그인해 주세요.');

  const spreadsheetId = await getOrCreateSpreadsheet(token);
  const items = await loadGlossary();
  
  // Find max ID and increment
  const maxId = items.reduce((max, current) => (current.id > max ? current.id : max), 100);
  const newId = maxId + 1;

  const newItem: GlossaryItem = {
    ...item,
    id: newId
  };

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Glossary!A:H:append?valueInputOption=USER_ENTERED`;
  const row = [
    newItem.id.toString(),
    newItem.term,
    newItem.abbreviation,
    newItem.definition,
    newItem.departments.join(', '),
    newItem.relatedTerms.join(', '),
    newItem.lastUpdated,
    newItem.updatedBy
  ];

  await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify({ values: [row] })
  });

  return newItem;
}

/**
 * Update an existing item in the glossary
 */
export async function updateGlossaryItem(item: GlossaryItem): Promise<GlossaryItem> {
  const token = await getAccessToken();
  if (!token) throw new Error('인증 토큰이 만료되었습니다.');

  const spreadsheetId = await getOrCreateSpreadsheet(token);

  // Find row index of the item
  const urlGet = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Glossary!A:A`;
  const data = await apiFetch(urlGet);

  if (!data.values) {
    throw new Error('데이터 저장소 형식이 유효하지 않습니다.');
  }

  let rowIndex = -1;
  for (let i = 0; i < data.values.length; i++) {
    if (parseInt(data.values[i][0], 10) === item.id) {
      rowIndex = i + 1; // 1-indexed for sheets range
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`ID ${item.id}인 용어를 찾을 수 없습니다.`);
  }

  const urlPut = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Glossary!A${rowIndex}:H${rowIndex}?valueInputOption=USER_ENTERED`;
  const row = [
    item.id.toString(),
    item.term,
    item.abbreviation,
    item.definition,
    item.departments.join(', '),
    item.relatedTerms.join(', '),
    item.lastUpdated,
    item.updatedBy
  ];

  await apiFetch(urlPut, {
    method: 'PUT',
    body: JSON.stringify({ values: [row] })
  });

  return item;
}

/**
 * Delete an item from the glossary
 */
export async function deleteGlossaryItem(id: number): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('인증 토큰이 만료되었습니다.');

  const spreadsheetId = await getOrCreateSpreadsheet(token);

  // 1. Get current row IDs to find the exact row index
  const urlGet = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Glossary!A:A`;
  const data = await apiFetch(urlGet);

  if (!data.values) {
    throw new Error('데이터 저장소 형식이 유효하지 않습니다.');
  }

  let rowIndex = -1;
  for (let i = 0; i < data.values.length; i++) {
    if (parseInt(data.values[i][0], 10) === id) {
      rowIndex = i; // 0-based for request index
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`ID ${id}인 용어를 찾을 수 없습니다.`);
  }

  if (cachedGlossarySheetId === null) {
    await loadSheetMetadata(spreadsheetId, token);
  }

  // 2. Execute deleteDimension batch update to shift rows up
  const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const body = {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: cachedGlossarySheetId || 0,
            dimension: 'ROWS',
            startIndex: rowIndex, // 0-based inclusive
            endIndex: rowIndex + 1 // 0-based exclusive
          }
        }
      }
    ]
  };

  await apiFetch(deleteUrl, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

/**
 * Logging quiz score and attempts to Google Sheet
 */
export async function logQuizAttempt(score: number, total: number, answersCorrect: string) {
  const token = await getAccessToken();
  if (!token) return;

  try {
    const spreadsheetId = await getOrCreateSpreadsheet(token);
    const user = getCurrentUser();
    const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const row = [
      timestamp,
      user?.displayName || '익명 임직원',
      user?.email || 'N/A',
      score.toString(),
      total.toString(),
      answersCorrect
    ];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/QuizLogs!A:F:append?valueInputOption=USER_ENTERED`;
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    });
  } catch (err) {
    console.error('퀴즈 로그 저장 중 에러:', err);
  }
}
