import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}

import { getEmailSettings } from './settings';

// 이메일 설정 정보를 가져오는 함수
export function getEmailConfig() {
  return getEmailSettings();
}

// 이메일 설정이 유효한지 확인하는 함수
export function validateEmailConfig(): { isValid: boolean, message: string } {
  const config = getEmailConfig();
  
  if (!config.user || !config.pass) {
    return { 
      isValid: false, 
      message: '이메일 전송 설정이 없습니다. 이메일 설정 페이지에서 필요한 정보를 입력해 주세요.' 
    };
  }
  
  return { isValid: true, message: '이메일 설정이 유효합니다.' };
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // 환경 변수에서 이메일 설정 가져오기
  const config = getEmailConfig();

  // 필수 환경 변수 확인
  if (!config.user || !config.pass) {
    console.error('이메일 전송 설정이 없습니다. 이메일 설정 페이지에서 필요한 정보를 입력해 주세요.');
    return false;
  }

  try {
    // 트랜스포터 생성 (네이버 SMTP 서버용)
    const transporter = nodemailer.createTransport({
      host: config.host, // smtp.naver.com
      port: config.port, // 465
      secure: true, // SSL 사용
      auth: {
        user: config.user, // 네이버 이메일 주소
        pass: config.pass, // 네이버 이메일 비밀번호 또는 앱 비밀번호
      },
    });

    // 이메일 기본 설정
    const mailOptions = {
      from: `"에스에스전력 자재관리시스템" <${config.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || [],
    };

    // 이메일 전송
    const info = await transporter.sendMail(mailOptions);
    console.log('이메일 전송 성공:', info.messageId);
    return true;
  } catch (error) {
    console.error('이메일 전송 실패:', error);
    return false;
  }
}

// 테스트 이메일 전송 함수
export async function sendTestEmail(to: string): Promise<{success: boolean, message: string}> {
  try {
    const result = await sendEmail({
      to,
      subject: '자재관리시스템 이메일 테스트',
      text: '이 이메일은 자재관리시스템의 이메일 기능 테스트를 위해 발송되었습니다.',
      html: `
        <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="padding: 20px; background-color: #f8f9fa; border-bottom: 3px solid #0062FF;">
            <h2 style="margin: 0; color: #333;">에스에스전력 자재관리시스템</h2>
            <p style="margin: 5px 0 0; color: #666;">이메일 테스트</p>
          </div>
          
          <div style="padding: 20px; background-color: white; border: 1px solid #e9ecef; border-top: none;">
            <p>안녕하세요, 에스에스전력 자재관리시스템입니다.</p>
            <p>이 이메일은 시스템의 이메일 발송 기능이 정상적으로 작동하는지 테스트하기 위해 발송되었습니다.</p>
            <p>이 이메일을 받으셨다면 이메일 발송 기능이 정상적으로 작동하고 있음을 의미합니다.</p>
            <p style="margin-top: 30px;">감사합니다.</p>
          </div>
          
          <div style="padding: 15px; background-color: #f1f3f5; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d;">
            <p>© 2025 주식회사 에스에스전력. All rights reserved.</p>
          </div>
        </div>
      `
    });
    
    if (result) {
      return { success: true, message: '테스트 이메일이 성공적으로 발송되었습니다.' };
    } else {
      return { success: false, message: '테스트 이메일 발송에 실패했습니다. 로그를 확인해주세요.' };
    }
  } catch (error) {
    console.error('테스트 이메일 발송 오류:', error);
    return { 
      success: false, 
      message: `테스트 이메일 발송 중 오류가 발생했습니다: ${(error as Error).message}` 
    };
  }
}

export async function sendPurchaseOrderEmail({
  to,
  projectName,
  pdfPath,
  orderNumber,
}: {
  to: string;
  projectName: string;
  pdfPath: string;
  orderNumber: string;
}): Promise<boolean> {
  const companyName = '주식회사 에스에스전력';
  const subject = `[${companyName}] 자재 발주서 (${projectName})`;
  
  const text = `
안녕하세요, ${companyName}입니다.

${projectName} 현장에 대한 자재 발주서를 첨부하여 보내드립니다.
발주서 번호: ${orderNumber}

검토 후 회신 부탁드립니다.

감사합니다.
${companyName} 자재관리팀
  `.trim();

  const html = `
<div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="padding: 20px; background-color: #f8f9fa; border-bottom: 3px solid #0062FF;">
    <h2 style="margin: 0; color: #333;">${companyName}</h2>
    <p style="margin: 5px 0 0; color: #666;">자재관리시스템</p>
  </div>
  
  <div style="padding: 20px; background-color: white; border: 1px solid #e9ecef; border-top: none;">
    <p>안녕하세요, ${companyName}입니다.</p>
    
    <p><strong>${projectName}</strong> 현장에 대한 자재 발주서를 첨부하여 보내드립니다.</p>
    <p>발주서 번호: <strong>${orderNumber}</strong></p>
    
    <p>검토 후 회신 부탁드립니다.</p>
    
    <p style="margin-top: 30px;">감사합니다.<br>${companyName} 자재관리팀</p>
  </div>
  
  <div style="padding: 15px; background-color: #f1f3f5; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d;">
    <p>© 2025 주식회사 에스에스전력. All rights reserved.</p>
  </div>
</div>
  `.trim();

  const attachments = [
    {
      filename: `${projectName}_발주서_${orderNumber}.pdf`,
      path: pdfPath,
    },
  ];

  return sendEmail({
    to,
    subject,
    text,
    html,
    attachments,
  });
}