import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, Mail, CheckCircle, Settings, Edit } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";

// 이메일 테스트 스키마
const emailTestSchema = z.object({
  email: z.string().email({ message: "유효한 이메일 주소를 입력해주세요." }),
});

type EmailTestFormValues = z.infer<typeof emailTestSchema>;

// 이메일 설정 스키마
const emailSettingsSchema = z.object({
  user: z.string().email({ message: "유효한 이메일 주소를 입력해주세요." }),
  pass: z.string().min(1, { message: "비밀번호는 필수 입력 항목입니다." }),
  host: z.string().min(1, { message: "서버 주소는 필수 입력 항목입니다." }),
  port: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "포트 번호는 양수여야 합니다.",
  }),
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

export default function EmailTest() {
  const { toast } = useToast();
  const [emailConfig, setEmailConfig] = useState<{isValid: boolean, message: string, settings?: any} | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  // 이메일 테스트 폼
  const form = useForm<EmailTestFormValues>({
    resolver: zodResolver(emailTestSchema),
    defaultValues: {
      email: "",
    },
  });
  
  // 이메일 설정 폼
  const settingsForm = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      user: "",
      pass: "",
      host: "smtp.naver.com",
      port: "465",
    },
  });

  // 이메일 설정 확인 함수
  const checkEmailConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await apiRequest("/api/email/config", { method: "GET" });
      setEmailConfig(response);
    } catch (error) {
      toast({
        title: "이메일 설정 확인 실패",
        description: (error as Error).message || "이메일 설정을 확인하는데 실패했습니다.",
        variant: "destructive",
      });
      setEmailConfig({
        isValid: false,
        message: "이메일 설정을 확인하는데 실패했습니다."
      });
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // 테스트 이메일 전송 mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: (data: EmailTestFormValues) => 
      apiRequest("/api/email/test", { 
        method: "POST", 
        body: { email: data.email } 
      }),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "테스트 이메일 전송 성공",
          description: data.message,
        });
      } else {
        toast({
          title: "테스트 이메일 전송 실패",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "테스트 이메일 전송 실패",
        description: error.message || "테스트 이메일을 전송하는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 이메일 설정 저장 mutation
  const updateEmailSettingsMutation = useMutation({
    mutationFn: (data: EmailSettingsFormValues) => 
      apiRequest("/api/email/config", { 
        method: "POST", 
        body: data
      }),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "이메일 설정 업데이트 성공",
          description: data.message,
        });
        setEmailConfig(prev => ({
          ...prev as any,
          ...data.config,
          settings: {
            ...data.config.settings,
            pass: "********"
          }
        }));
        setIsSettingsDialogOpen(false);
      } else {
        toast({
          title: "이메일 설정 업데이트 실패",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "이메일 설정 업데이트 실패",
        description: error.message || "이메일 설정을 업데이트하는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });
  
  // 페이지 로드 시 이메일 설정 상태 확인
  useEffect(() => {
    checkEmailConfig();
  }, []);
  
  // 설정 다이얼로그 열기 시 현재 설정값 로드
  useEffect(() => {
    if (isSettingsDialogOpen && emailConfig?.settings) {
      settingsForm.reset({
        user: emailConfig.settings.user || "",
        pass: "********", // 비밀번호는 보안을 위해 마스킹 처리
        host: emailConfig.settings.host || "smtp.naver.com",
        port: String(emailConfig.settings.port || 465),
      });
    }
  }, [isSettingsDialogOpen, emailConfig, settingsForm]);

  // 테스트 이메일 폼 제출 핸들러
  const onSubmit = (data: EmailTestFormValues) => {
    sendTestEmailMutation.mutate(data);
  };
  
  // 이메일 설정 폼 제출 핸들러
  const onSettingsSubmit = (data: EmailSettingsFormValues) => {
    updateEmailSettingsMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-2 sm:p-4">
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b">
          <CardTitle className="text-xl sm:text-2xl font-bold flex items-center">
            <Mail className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            이메일 서버 설정 테스트
          </CardTitle>
          <CardDescription>
            이메일 서버 설정을 확인하고 테스트 이메일을 발송합니다.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 p-3 sm:p-6">
          {/* 이메일 설정 상태 */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-lg border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="text-lg font-medium flex items-center">
                <Settings className="mr-2 h-5 w-5 text-blue-500" />
                이메일 서버 설정 상태
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkEmailConfig}
                disabled={isLoadingConfig}
                className="w-full sm:w-auto"
              >
                <Settings className="mr-2 h-4 w-4" />
                {isLoadingConfig ? "확인 중..." : "설정 확인"}
              </Button>
            </div>
            
            {emailConfig ? (
              <Alert variant={emailConfig.isValid ? "default" : "destructive"} className="mt-3">
                {emailConfig.isValid ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {emailConfig.isValid ? "이메일 설정이 유효합니다" : "이메일 설정 오류"}
                </AlertTitle>
                <AlertDescription>
                  {emailConfig.message}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex items-center justify-center h-20 border rounded-md bg-muted">
                <p className="text-sm text-muted-foreground">이메일 설정을 확인 중입니다...</p>
              </div>
            )}
          </div>
          
          {/* 테스트 이메일 발송 폼 */}
          <div className="space-y-4 p-4 bg-white rounded-lg border">
            <h3 className="text-lg font-medium flex items-center">
              <Mail className="mr-2 h-5 w-5 text-blue-500" />
              테스트 이메일 발송
            </h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일 주소</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="test@example.com" 
                          className="w-full" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        테스트 이메일을 받을 이메일 주소를 입력하세요.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  disabled={sendTestEmailMutation.isPending || !emailConfig?.isValid}
                  className="w-full sm:w-auto"
                >
                  {sendTestEmailMutation.isPending ? "이메일 전송 중..." : "테스트 이메일 발송"}
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4 p-3 sm:p-6 bg-slate-50">
          {/* 모바일에서는 세로로, 데스크탑에서는 가로로 배열 */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center w-full gap-4">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">현재 이메일 서버 설정:</p>
              {emailConfig?.settings && (
                <ul className="list-disc list-inside ml-4 mt-2">
                  <li>이메일: {emailConfig.settings.user || '-'}</li>
                  <li>서버: {emailConfig.settings.host || 'smtp.naver.com'}</li>
                  <li>포트: {emailConfig.settings.port || 465}</li>
                </ul>
              )}
            </div>
            
            <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto mt-2 md:mt-0">
                  <Edit className="mr-2 h-4 w-4" />
                  이메일 설정 변경
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] w-[95vw] max-w-[95vw] sm:w-auto">
                <DialogHeader>
                  <DialogTitle>이메일 서버 설정</DialogTitle>
                  <DialogDescription>
                    이메일 발송에 사용할 SMTP 서버 정보를 입력하세요.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...settingsForm}>
                  <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
                    <FormField
                      control={settingsForm.control}
                      name="user"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이메일 주소</FormLabel>
                          <FormControl>
                            <Input placeholder="your-email@naver.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={settingsForm.control}
                      name="pass"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>비밀번호</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="이메일 비밀번호 또는 앱 비밀번호" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            이메일 비밀번호 또는 앱 비밀번호를 입력하세요.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={settingsForm.control}
                      name="host"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP 서버</FormLabel>
                          <FormControl>
                            <Input placeholder="smtp.naver.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={settingsForm.control}
                      name="port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>포트</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="465" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter className="mt-6">
                      <Button 
                        type="submit" 
                        disabled={updateEmailSettingsMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        {updateEmailSettingsMutation.isPending ? "저장 중..." : "설정 저장"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="text-sm text-muted-foreground mt-4 p-3 bg-white rounded-md border">
            <div className="flex items-center font-medium text-blue-600 mb-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              참고 사항
            </div>
            <p className="mt-1">네이버 이메일 사용 시 앱 비밀번호를 생성하여 사용하는 것을 권장합니다.</p>
            <p className="mt-1">앱 비밀번호는 네이버 계정 설정 {'>'}  보안 설정 {'>'}  2단계 인증 {'>'} 앱 비밀번호 생성에서 만들 수 있습니다.</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}