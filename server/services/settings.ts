import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// 설정 저장 파일의 경로
const SETTINGS_FILE_PATH = path.join(process.cwd(), 'settings.json');

// 이메일 설정 스키마
const emailSettingsSchema = z.object({
  user: z.string().min(1, "이메일 주소는 필수입니다"),
  pass: z.string().min(1, "비밀번호는 필수입니다"),
  host: z.string().min(1, "서버 주소는 필수입니다"),
  port: z.number().int().positive("포트는 양수여야 합니다"),
});

export type EmailSettings = z.infer<typeof emailSettingsSchema>;

// 전체 설정 스키마
const settingsSchema = z.object({
  email: emailSettingsSchema
});

export type Settings = z.infer<typeof settingsSchema>;

// 기본 설정
const DEFAULT_SETTINGS: Settings = {
  email: {
    user: '',
    pass: '',
    host: 'smtp.naver.com',
    port: 465
  }
};

// 설정 파일 불러오기
export function loadSettings(): Settings {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      const settings = JSON.parse(fileContent);
      return settingsSchema.parse(settings);
    }
  } catch (error) {
    console.error('설정 파일 로드 실패:', error);
  }
  
  // 파일이 없거나 오류가 발생한 경우 기본 설정 반환
  return DEFAULT_SETTINGS;
}

// 설정 저장하기
export function saveSettings(settings: Settings): boolean {
  try {
    const validatedSettings = settingsSchema.parse(settings);
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(validatedSettings, null, 2), 'utf-8');
    
    // 환경 변수 업데이트
    process.env.EMAIL_USER = validatedSettings.email.user;
    process.env.EMAIL_PASS = validatedSettings.email.pass;
    process.env.EMAIL_HOST = validatedSettings.email.host;
    process.env.EMAIL_PORT = validatedSettings.email.port.toString();
    
    return true;
  } catch (error) {
    console.error('설정 저장 실패:', error);
    return false;
  }
}

// 현재 이메일 설정 가져오기
export function getEmailSettings(): EmailSettings {
  // 환경 변수를 우선적으로 사용
  const settings = {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    host: process.env.EMAIL_HOST || 'smtp.naver.com',
    port: Number(process.env.EMAIL_PORT || 465)
  };
  
  return settings;
}

// 이메일 설정 업데이트
export function updateEmailSettings(newSettings: EmailSettings): boolean {
  try {
    // 유효성 검사
    const validatedSettings = emailSettingsSchema.parse(newSettings);
    
    // 현재 전체 설정 가져오기
    const currentSettings = loadSettings();
    
    // 이메일 설정 업데이트
    currentSettings.email = validatedSettings;
    
    // 전체 설정 저장
    return saveSettings(currentSettings);
  } catch (error) {
    console.error('이메일 설정 업데이트 실패:', error);
    return false;
  }
}