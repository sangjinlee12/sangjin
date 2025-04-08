import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExcelUploadModal from "@/components/import-export/ExcelUploadModal";
import ExcelTemplateSection from "@/components/excel/ExcelTemplateSection";
import ExcelExportSection from "@/components/excel/ExcelExportSection";

export default function ExcelUpload() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>엑셀 일괄 관리</CardTitle>
          <CardDescription>
            엑셀 파일을 이용하여 재고 데이터를 일괄 업로드하거나 다운로드하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="upload" className="flex items-center">
                <span className="material-icons text-sm mr-2">upload_file</span>
                데이터 업로드
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center">
                <span className="material-icons text-sm mr-2">download</span>
                데이터 내보내기
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload">
              <ExcelTemplateSection onUploadClick={() => setIsUploadModalOpen(true)} />
            </TabsContent>
            
            <TabsContent value="export">
              <ExcelExportSection />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ExcelUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
