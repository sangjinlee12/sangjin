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

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // 환경 변수에서 이메일 설정 가져오기
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS;
  const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.naver.com';
  const EMAIL_PORT = Number(process.env.EMAIL_PORT || 465);

  // 필수 환경 변수 확인
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.error('이메일 전송 설정이 없습니다. EMAIL_USER와 EMAIL_PASS 환경 변수를 설정해 주세요.');
    return false;
  }

  try {
    // 트랜스포터 생성
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: true, // SSL 사용
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    // 이메일 기본 설정
    const mailOptions = {
      from: `"에스에스전력 자재관리시스템" <${EMAIL_USER}>`,
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

// 발주서 이메일 전송 함수
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