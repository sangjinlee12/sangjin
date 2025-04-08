import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Category } from "@shared/schema";
import { createInventoryTemplate } from "@/lib/excel";
import { useToast } from "@/hooks/use-toast";

type ExcelTemplateSectionProps = {
  onUploadClick: () => void;
};

export const ExcelTemplateSection = ({ onUploadClick }: ExcelTemplateSectionProps) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Fetch categories for the template
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories']
  });

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      
      // Option 1: Using our frontend utility
      await createInventoryTemplate(categories);
      
      // Option 2: Using the backend endpoint
      // window.location.href = '/api/excel/template';
      
      toast({
        title: "템플릿 다운로드 완료",
        description: "엑셀 템플릿이 다운로드되었습니다."
      });
    } catch (error) {
      toast({
        title: "템플릿 다운로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-medium mb-4">엑셀 업로드 방법</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>아래의 <strong>템플릿 다운로드</strong> 버튼을 클릭하여 템플릿 파일을 다운로드합니다.</li>
          <li>템플릿의 지침에 따라 자재 정보를 채워 넣습니다.</li>
          <li><strong>파일 업로드</strong> 버튼을 클릭하고 완성된 엑셀 파일을 선택합니다.</li>
          <li>업로드 결과를 확인하고 필요한 경우 수정합니다.</li>
        </ol>
      </div>
      
      <div className="p-6 border rounded-lg">
        <h3 className="text-lg font-medium mb-4">템플릿 다운로드</h3>
        <p className="text-gray-700 mb-4">
          정확한 데이터 입력을 위해 제공되는 템플릿을 사용하세요. 템플릿에는 필요한 필드와 샘플 데이터가 포함되어 있습니다.
        </p>
        
        <div className="flex items-center p-4 bg-gray-50 rounded-lg border">
          <div className="flex-1">
            <div className="flex items-center">
              <span className="material-icons text-green-600 mr-2">description</span>
              <span className="font-medium">재고등록_템플릿.xlsx</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              자재 등록에 사용되는 템플릿입니다.
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={handleDownloadTemplate}
            disabled={isDownloading}
            className="flex items-center"
          >
            {isDownloading ? (
              <>
                <span className="material-icons text-sm mr-2 animate-spin">sync</span>
                다운로드 중...
              </>
            ) : (
              <>
                <span className="material-icons text-sm mr-2">download</span>
                템플릿 다운로드
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="p-6 border rounded-lg bg-blue-50 border-blue-200">
        <h3 className="text-lg font-medium mb-4">파일 업로드</h3>
        <p className="text-gray-700 mb-4">
          작성이 완료된 엑셀 파일을 업로드하여 재고 데이터를 일괄 등록하세요.
        </p>
        
        <Button 
          onClick={onUploadClick}
          className="w-full flex items-center justify-center"
        >
          <span className="material-icons text-sm mr-2">upload_file</span>
          파일 업로드
        </Button>
      </div>
    </div>
  );
};

export default ExcelTemplateSection;
