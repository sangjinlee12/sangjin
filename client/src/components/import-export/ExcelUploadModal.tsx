import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type ExcelUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const ExcelUploadModal = ({ isOpen, onClose }: ExcelUploadModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 90) {
            clearInterval(interval);
            return 90;
          }
          return newProgress;
        });
      }, 300);
      
      try {
        const response = await fetch('/api/excel/import', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        clearInterval(interval);
        setUploadProgress(100);
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || response.statusText);
        }
        
        return await response.json();
      } catch (error) {
        clearInterval(interval);
        setUploadProgress(0);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "업로드 완료",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setTimeout(() => {
        setUploadProgress(0);
        setSelectedFile(null);
        onClose();
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: "업로드 실패",
        description: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: "destructive"
      });
      setUploadProgress(0);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    } else {
      toast({
        title: "파일을 선택해주세요",
        variant: "destructive"
      });
    }
  };

  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/excel/template', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('템플릿 다운로드 중 오류가 발생했습니다.');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "템플릿 다운로드 완료",
      });
    } catch (error) {
      toast({
        title: "템플릿 다운로드 실패",
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>엑셀 일괄 업로드</DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div 
            className={`bg-gray-100 rounded-lg border-2 border-dashed ${isDragging ? 'border-primary' : 'border-gray-200'} p-8 text-center mb-6`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                className="hidden"
              />
              
              {uploadMutation.isPending ? (
                <div className="w-full">
                  <p className="text-lg font-medium mb-2">업로드 중...</p>
                  <Progress value={uploadProgress} className="h-2 mb-2" />
                  <p className="text-sm text-gray-500">{uploadProgress}% 완료</p>
                </div>
              ) : selectedFile ? (
                <div className="flex flex-col items-center">
                  <span className="material-icons text-4xl text-green-600 mb-2">description</span>
                  <h4 className="text-lg font-medium mb-1">{selectedFile.name}</h4>
                  <p className="text-sm text-gray-500 mb-4">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setSelectedFile(null)}>
                      파일 변경
                    </Button>
                    <Button onClick={handleUpload}>
                      업로드 시작
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="material-icons text-4xl text-gray-400 mb-2">upload_file</span>
                  <h4 className="text-lg font-medium mb-1">파일을 드래그하거나 클릭하여 업로드</h4>
                  <p className="text-sm text-gray-500 mb-4">지원 형식: .xlsx, .xls</p>
                  <Button onClick={handleSelectFile}>
                    파일 선택
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-gray-100 rounded-lg p-4">
            <h4 className="font-medium mb-2">엑셀 파일 템플릿</h4>
            <p className="text-sm text-gray-500 mb-3">정확한 업로드를 위해 아래 템플릿을 사용하세요:</p>
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-white">
              <div className="flex items-center">
                <span className="material-icons text-green-600 mr-2">description</span>
                <span className="font-medium text-sm">자재_업로드_템플릿.xlsx</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleDownloadTemplate}
              >
                <span className="material-icons">download</span>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end items-center p-6 border-t border-gray-200 bg-gray-100">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={uploadMutation.isPending}
            className="mr-2"
          >
            취소
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
          >
            업로드
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExcelUploadModal;
