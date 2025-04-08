import * as XLSX from 'xlsx';
import { InventoryItem, Category, Transaction } from '@shared/schema';

/**
 * Interface for exporting inventory items to Excel
 */
export interface ExportInventoryOptions {
  includeTransactions?: boolean;
  categoryFilter?: string;
  searchQuery?: string;
}

/**
 * Exports inventory data to Excel file and triggers download
 */
export const exportInventoryToExcel = async (
  items: InventoryItem[],
  categories: Category[],
  options: ExportInventoryOptions = {}
): Promise<void> => {
  try {
    // Filter items if options provided
    let filteredItems = [...items];
    
    if (options.categoryFilter && options.categoryFilter !== 'all') {
      filteredItems = filteredItems.filter(item => 
        item.categoryId.toString() === options.categoryFilter
      );
    }
    
    if (options.searchQuery) {
      const search = options.searchQuery.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.name.toLowerCase().includes(search) || 
        item.code.toLowerCase().includes(search) ||
        (item.specification && item.specification.toLowerCase().includes(search))
      );
    }
    
    // Create a category lookup map
    const categoryMap = new Map<number, string>();
    categories.forEach(category => {
      categoryMap.set(category.id, category.name);
    });
    
    // Transform items for export
    const exportData = filteredItems.map(item => ({
      '코드': item.code,
      '품명': item.name,
      '카테고리': categoryMap.get(item.categoryId) || '알 수 없음',
      '규격': item.specification || '',
      '현재 수량': item.currentQuantity,
      '최소 수량': item.minimumQuantity,
      '위치': item.location || '',
      '단가': item.unitPrice || '',
      '비고': item.notes || '',
      '등록일': new Date(item.createdAt).toISOString().split('T')[0],
      '업데이트': new Date(item.updatedAt).toISOString().split('T')[0]
    }));
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, '재고 현황');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveExcelFile(excelBuffer, '재고현황_내보내기.xlsx');
    
  } catch (error) {
    console.error('Excel export failed:', error);
    throw new Error('Excel 내보내기에 실패했습니다.');
  }
};

/**
 * Exports transaction history to Excel file and triggers download
 */
export const exportTransactionHistoryToExcel = async (
  transactions: Transaction[],
  items: InventoryItem[],
  categories: Category[],
  options: {
    startDate?: Date;
    endDate?: Date;
    categoryFilter?: string;
    typeFilter?: string;
  } = {}
): Promise<void> => {
  try {
    // Create an item lookup map
    const itemMap = new Map<number, InventoryItem>();
    items.forEach(item => {
      itemMap.set(item.id, item);
    });
    
    // Create a category lookup map
    const categoryMap = new Map<number, string>();
    categories.forEach(category => {
      categoryMap.set(category.id, category.name);
    });
    
    // Filter transactions based on options
    let filteredTransactions = [...transactions];
    
    if (options.startDate) {
      filteredTransactions = filteredTransactions.filter(transaction => 
        new Date(transaction.createdAt) >= options.startDate!
      );
    }
    
    if (options.endDate) {
      const endDate = new Date(options.endDate);
      endDate.setHours(23, 59, 59, 999); // End of the day
      filteredTransactions = filteredTransactions.filter(transaction => 
        new Date(transaction.createdAt) <= endDate
      );
    }
    
    if (options.typeFilter) {
      filteredTransactions = filteredTransactions.filter(transaction => 
        transaction.type === options.typeFilter
      );
    }
    
    if (options.categoryFilter && options.categoryFilter !== 'all') {
      filteredTransactions = filteredTransactions.filter(transaction => {
        const item = itemMap.get(transaction.itemId);
        return item && item.categoryId.toString() === options.categoryFilter;
      });
    }
    
    // Sort transactions by date (newest first)
    filteredTransactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Transform transactions for export
    const exportData = filteredTransactions.map(transaction => {
      const item = itemMap.get(transaction.itemId);
      const categoryName = item ? categoryMap.get(item.categoryId) || '알 수 없음' : '알 수 없음';
      
      return {
        '날짜': new Date(transaction.createdAt).toISOString().split('T')[0],
        '시간': new Date(transaction.createdAt).toISOString().split('T')[1].substring(0, 5),
        '유형': transaction.type === 'in' ? '입고' : '출고',
        '품목 코드': item ? item.code : '',
        '품목명': item ? item.name : '',
        '카테고리': categoryName,
        '수량': transaction.quantity,
        '프로젝트': transaction.project || '',
        '비고': transaction.note || ''
      };
    });
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, '입출고 이력');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveExcelFile(excelBuffer, '입출고이력_내보내기.xlsx');
    
  } catch (error) {
    console.error('Excel export failed:', error);
    throw new Error('Excel 내보내기에 실패했습니다.');
  }
};

/**
 * Creates an Excel template file for bulk inventory upload
 */
export const createInventoryTemplate = async (
  categories: Category[]
): Promise<void> => {
  try {
    // Create sample data with instructions
    const templateData = [
      {
        'name': '자재명 (필수)',
        'categoryId': '카테고리ID (필수)',
        'specification': '상세 규격 (선택)',
        'currentQuantity': '현재 수량 (필수)',
        'minimumQuantity': '최소 수량 (필수)',
        'location': '위치 (선택)',
        'unitPrice': '단가 (선택)',
        'notes': '비고 (선택)'
      },
      {
        'name': '※ 아래는 참고용 샘플 데이터입니다.',
        'categoryId': `※ 카테고리 ID 목록: ${categories.map(c => `${c.id}=${c.name}`).join(', ')}`,
        'specification': '',
        'currentQuantity': '',
        'minimumQuantity': '',
        'location': '',
        'unitPrice': '',
        'notes': ''
      },
      {
        'name': 'UTP 케이블 Cat.6',
        'categoryId': categories.find(c => c.name === '케이블 종류')?.id || 1,
        'specification': '길이: 100m, 색상: 회색',
        'currentQuantity': 20,
        'minimumQuantity': 10,
        'location': 'A-15-3',
        'unitPrice': 45000,
        'notes': '최소 주문 수량: 10개'
      },
      {
        'name': 'LED 매입등 20W',
        'categoryId': categories.find(c => c.name === '등기구 종류')?.id || 2,
        'specification': '색온도: 5700K, 크기: 6인치',
        'currentQuantity': 15,
        'minimumQuantity': 5,
        'location': 'B-03-2',
        'unitPrice': 18000,
        'notes': '보증기간: 2년'
      }
    ];
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, '재고 등록 템플릿');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveExcelFile(excelBuffer, '재고등록_템플릿.xlsx');
    
  } catch (error) {
    console.error('Excel template creation failed:', error);
    throw new Error('템플릿 생성에 실패했습니다.');
  }
};

/**
 * Helper function to save the Excel file and trigger browser download
 */
const saveExcelFile = (buffer: ArrayBuffer, fileName: string): void => {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

/**
 * Parse an Excel file and extract inventory data
 */
export const parseExcelInventory = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error('엑셀 파일 파싱에 실패했습니다.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('파일 읽기에 실패했습니다.'));
    };
    
    reader.readAsBinaryString(file);
  });
};
