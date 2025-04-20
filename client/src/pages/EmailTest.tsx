import { useState } from 'react';
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
import { AlertCircle, Mail, CheckCircle, Settings } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// 이메일 테스트 스키마
const emailTestSchema = z.object({
  email: z.string().email({ message: "유효한 이메일 주소를 입력해주세요." }),
});

type EmailTestFormValues = z.infer<typeof emailTestSchema>;

export default function EmailTest() {
  const { toast } = useToast();
  const [emailConfig, setEmailConfig] = useState<{isValid: boolean, message: string} | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // 이메일 테스트 폼
  const form = useForm<EmailTestFormValues>({
    resolver: zodResolver(emailTestSchema),
    defaultValues: {
      email: "",
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

  // 페이지 로드 시 이메일 설정 상태 확인
  useState(() => {
    checkEmailConfig();
  });

  // 폼 제출 핸들러
  const onSubmit = (data: EmailTestFormValues) => {
    sendTestEmailMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <Mail className="mr-2 h-6 w-6" />
            이메일 서버 설정 테스트
          </CardTitle>
          <CardDescription>
            이메일 서버 설정을 확인하고 테스트 이메일을 발송합니다.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* 이메일 설정 상태 */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">이메일 서버 설정 상태</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkEmailConfig}
                disabled={isLoadingConfig}
              >
                <Settings className="mr-2 h-4 w-4" />
                {isLoadingConfig ? "확인 중..." : "설정 확인"}
              </Button>
            </div>
            
            {emailConfig ? (
              <Alert variant={emailConfig.isValid ? "default" : "destructive"}>
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
          <div className="space-y-4">
            <h3 className="text-lg font-medium">테스트 이메일 발송</h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일 주소</FormLabel>
                      <FormControl>
                        <Input placeholder="test@example.com" {...field} />
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
                  className="w-full"
                >
                  {sendTestEmailMutation.isPending ? "이메일 전송 중..." : "테스트 이메일 발송"}
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>이메일 서버 설정을 완료하려면 다음 환경변수가 필요합니다:</p>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>EMAIL_USER: 이메일 계정</li>
              <li>EMAIL_PASS: 이메일 비밀번호 또는 앱 비밀번호</li>
              <li>EMAIL_HOST: 이메일 서버 주소 (기본값: smtp.naver.com)</li>
              <li>EMAIL_PORT: 이메일 서버 포트 (기본값: 465)</li>
            </ul>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}