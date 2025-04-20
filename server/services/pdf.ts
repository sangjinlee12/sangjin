import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { PurchaseOrder, PurchaseOrderItem } from '@shared/schema';

// PDF 생성 함수
export async function generatePurchaseOrderPDF(
  purchaseOrder: PurchaseOrder,
  items: PurchaseOrderItem[]
): Promise<string> {
  // PDF 파일 경로 설정
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  // uploads 디렉토리가 없으면 생성
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const pdfDir = path.join(uploadsDir, 'purchase_orders');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }
  
  // 파일명 생성 (현장명_발주서_날짜_ID)
  const dateStr = format(new Date(), 'yyyyMMdd');
  const fileName = `${purchaseOrder.projectName}_발주서_${dateStr}_${purchaseOrder.id}.pdf`;
  const filePath = path.join(pdfDir, fileName);
  
  // PDF 문서 생성
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4', 
        margin: 50,
        info: {
          Title: `${purchaseOrder.projectName} 발주서`,
          Author: '에스에스전력 자재관리시스템',
          Creator: '에스에스전력 자재관리시스템',
        }
      });
      
      // PDF 스트림 설정
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // 폰트 설정 (기본 폰트를 사용하지만, 나중에 한글 폰트 추가 가능)
      
      // 회사 헤더 추가
      doc.fontSize(20).font('Helvetica-Bold').text('주식회사 에스에스전력', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('자재 발주서', { align: 'center' });
      doc.moveDown();
      
      // 구분선
      doc.moveTo(50, doc.y)
         .lineTo(doc.page.width - 50, doc.y)
         .stroke();
      doc.moveDown();
      
      // 발주서 정보 테이블
      const orderDate = purchaseOrder.orderDate ? format(new Date(purchaseOrder.orderDate), 'yyyy-MM-dd') : '';
      
      // 2x4 테이블 생성
      const infoTableTop = doc.y;
      const infoTableWidth = doc.page.width - 100;
      const infoColWidth = infoTableWidth / 2;
      const infoRowHeight = 25;
      
      // 첫 번째 행
      doc.rect(50, infoTableTop, infoTableWidth, infoRowHeight).stroke();
      doc.font('Helvetica-Bold').fontSize(10)
         .text('발주번호', 55, infoTableTop + 7, { width: 60 });
      doc.font('Helvetica').text(`: ${purchaseOrder.orderNumber}`, 115, infoTableTop + 7, { width: infoColWidth - 70 });
      
      doc.font('Helvetica-Bold')
         .text('발주일자', 50 + infoColWidth + 5, infoTableTop + 7, { width: 60 });
      doc.font('Helvetica')
         .text(`: ${orderDate}`, 50 + infoColWidth + 65, infoTableTop + 7, { width: infoColWidth - 70 });
      
      // 두 번째 행
      const row2Top = infoTableTop + infoRowHeight;
      doc.rect(50, row2Top, infoTableWidth, infoRowHeight).stroke();
      doc.font('Helvetica-Bold')
         .text('현장명', 55, row2Top + 7, { width: 60 });
      doc.font('Helvetica')
         .text(`: ${purchaseOrder.projectName}`, 115, row2Top + 7, { width: infoColWidth - 70 });
      
      doc.font('Helvetica-Bold')
         .text('담당자', 50 + infoColWidth + 5, row2Top + 7, { width: 60 });
      doc.font('Helvetica')
         .text(`: ${purchaseOrder.manager}`, 50 + infoColWidth + 65, row2Top + 7, { width: infoColWidth - 70 });
      
      // 세 번째 행
      const row3Top = row2Top + infoRowHeight;
      doc.rect(50, row3Top, infoTableWidth, infoRowHeight).stroke();
      doc.font('Helvetica-Bold')
         .text('업체명', 55, row3Top + 7, { width: 60 });
      doc.font('Helvetica')
         .text(`: ${purchaseOrder.vendorName}`, 115, row3Top + 7, { width: infoColWidth - 70 });
      
      doc.font('Helvetica-Bold')
         .text('연락처', 50 + infoColWidth + 5, row3Top + 7, { width: 60 });
      doc.font('Helvetica')
         .text(`: ${purchaseOrder.contactNumber || ''}`, 50 + infoColWidth + 65, row3Top + 7, { width: infoColWidth - 70 });
      
      // 네 번째 행 - 비고 필드
      const row4Top = row3Top + infoRowHeight;
      doc.rect(50, row4Top, infoTableWidth, infoRowHeight).stroke();
      doc.font('Helvetica-Bold')
         .text('비고', 55, row4Top + 7, { width: 60 });
      doc.font('Helvetica')
         .text(`: ${purchaseOrder.notes || ''}`, 115, row4Top + 7, { width: infoTableWidth - 70 });
      
      doc.moveDown(2);
      
      // 발주 항목 테이블 헤더
      const tableTop = doc.y;
      const tableWidth = doc.page.width - 100;
      
      const colWidths = {
        no: 30,
        name: 130,
        spec: 130,
        unit: 40,
        quantity: 50,
        price: 70,
        amount: 80
      };
      
      // 테이블 헤더
      doc.rect(50, tableTop, tableWidth, 20).fillAndStroke('#f1f3f5', '#000000');
      
      let xPos = 50;
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
      
      doc.text('No.', xPos + 5, tableTop + 6, { width: colWidths.no, align: 'center' });
      xPos += colWidths.no;
      
      doc.text('품명', xPos + 5, tableTop + 6, { width: colWidths.name, align: 'center' });
      xPos += colWidths.name;
      
      doc.text('규격', xPos + 5, tableTop + 6, { width: colWidths.spec, align: 'center' });
      xPos += colWidths.spec;
      
      doc.text('단위', xPos + 5, tableTop + 6, { width: colWidths.unit, align: 'center' });
      xPos += colWidths.unit;
      
      doc.text('수량', xPos + 5, tableTop + 6, { width: colWidths.quantity, align: 'center' });
      xPos += colWidths.quantity;
      
      doc.text('단가', xPos + 5, tableTop + 6, { width: colWidths.price, align: 'center' });
      xPos += colWidths.price;
      
      doc.text('금액', xPos + 5, tableTop + 6, { width: colWidths.amount, align: 'center' });
      
      // 아이템 행 그리기
      let itemY = tableTop + 20;
      const itemHeight = 25;
      let totalAmount = 0;
      
      items.forEach((item, index) => {
        // 페이지 넘침 확인 및 새 페이지 추가
        if (itemY + itemHeight > doc.page.height - 50) {
          doc.addPage();
          itemY = 50;
          
          // 새 페이지에 테이블 헤더 다시 그리기
          doc.rect(50, itemY, tableWidth, 20).fillAndStroke('#f1f3f5', '#000000');
          
          xPos = 50;
          doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
          
          doc.text('No.', xPos + 5, itemY + 6, { width: colWidths.no, align: 'center' });
          xPos += colWidths.no;
          
          doc.text('품명', xPos + 5, itemY + 6, { width: colWidths.name, align: 'center' });
          xPos += colWidths.name;
          
          doc.text('규격', xPos + 5, itemY + 6, { width: colWidths.spec, align: 'center' });
          xPos += colWidths.spec;
          
          doc.text('단위', xPos + 5, itemY + 6, { width: colWidths.unit, align: 'center' });
          xPos += colWidths.unit;
          
          doc.text('수량', xPos + 5, itemY + 6, { width: colWidths.quantity, align: 'center' });
          xPos += colWidths.quantity;
          
          doc.text('단가', xPos + 5, itemY + 6, { width: colWidths.price, align: 'center' });
          xPos += colWidths.price;
          
          doc.text('금액', xPos + 5, itemY + 6, { width: colWidths.amount, align: 'center' });
          
          itemY += 20;
        }
        
        // 항목 행 테두리
        doc.rect(50, itemY, tableWidth, itemHeight).stroke();
        
        // 항목 데이터 입력
        xPos = 50;
        doc.font('Helvetica').fontSize(9);
        
        // 번호
        doc.text((index + 1).toString(), xPos + 5, itemY + 8, { width: colWidths.no, align: 'center' });
        xPos += colWidths.no;
        
        // 품명
        doc.text(item.itemName, xPos + 5, itemY + 8, { width: colWidths.name - 10 });
        xPos += colWidths.name;
        
        // 규격
        doc.text(item.specification || '', xPos + 5, itemY + 8, { width: colWidths.spec - 10 });
        xPos += colWidths.spec;
        
        // 단위
        doc.text(item.unitType || '', xPos + 5, itemY + 8, { width: colWidths.unit, align: 'center' });
        xPos += colWidths.unit;
        
        // 수량
        doc.text(item.quantity.toString(), xPos + 5, itemY + 8, { width: colWidths.quantity, align: 'right' });
        xPos += colWidths.quantity;
        
        // 단가
        const unitPrice = item.unitPrice ? Number(item.unitPrice) : 0;
        doc.text(unitPrice.toLocaleString('ko-KR'), xPos + 5, itemY + 8, { width: colWidths.price - 10, align: 'right' });
        xPos += colWidths.price;
        
        // 금액
        const amount = item.amount ? Number(item.amount) : (unitPrice * item.quantity);
        totalAmount += amount;
        doc.text(amount.toLocaleString('ko-KR'), xPos + 5, itemY + 8, { width: colWidths.amount - 10, align: 'right' });
        
        itemY += itemHeight;
      });
      
      // 합계 행
      doc.rect(50, itemY, tableWidth, itemHeight).fillAndStroke('#f1f3f5', '#000000');
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
      doc.text('합계', 55, itemY + 8, { width: colWidths.no + colWidths.name - 10 });
      
      const taxExcludedPos = 50 + colWidths.no + colWidths.name + colWidths.spec + colWidths.unit + colWidths.quantity;
      doc.text('총액', taxExcludedPos, itemY + 8, { width: colWidths.price, align: 'right' });
      doc.text(totalAmount.toLocaleString('ko-KR'), taxExcludedPos + colWidths.price, itemY + 8, { width: colWidths.amount - 10, align: 'right' });
      
      // 하단 서명란
      doc.moveDown(3);
      
      doc.fontSize(10).font('Helvetica-Bold').text('위와 같이 발주합니다.', { align: 'center' });
      doc.moveDown();
      
      const currentDate = format(new Date(), 'yyyy년 MM월 dd일');
      doc.text(`${currentDate}`, { align: 'center' });
      doc.moveDown();
      
      doc.text('주식회사 에스에스전력', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(10).font('Helvetica').text('(인)', doc.page.width - 100, doc.y - 12, { align: 'center' });
      
      // PDF 종료
      doc.end();
      
      // 스트림 완료 이벤트
      stream.on('finish', () => {
        resolve(filePath);
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}