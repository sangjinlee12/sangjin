import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Settings form schema
const settingsFormSchema = z.object({
  companyName: z.string().min(1, "회사명을 입력하세요"),
  email: z.string().email("유효한 이메일을 입력하세요"),
  lowStockNotifications: z.boolean().default(true),
  autoBackup: z.boolean().default(false),
  codePrefix: z.string().max(3, "최대 3자까지 입력 가능합니다")
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Default settings - in a real app these would come from the API
  const defaultSettings = {
    companyName: "통신전기 자재관리",
    email: "admin@company.com",
    lowStockNotifications: true,
    autoBackup: false,
    codePrefix: ""
  };
  
  // Create form
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: defaultSettings
  });
  
  // Settings update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      // Mock API call - in a real app, this would be an actual API endpoint
      return new Promise(resolve => {
        setTimeout(() => resolve(data), 1000);
      });
    },
    onSuccess: (data) => {
      toast({
        title: "설정 저장 완료",
        description: "설정이 성공적으로 저장되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "설정 저장 실패",
        description: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: "destructive"
      });
    }
  });
  
  const onSubmit = (data: SettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };
  
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>시스템 설정</CardTitle>
          <CardDescription>
            자재 관리 시스템의 기본 설정을 구성하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="general">
                  <AccordionTrigger>기본 설정</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>회사명</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              보고서와 문서에 표시될 회사명입니다.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>관리자 이메일</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" />
                            </FormControl>
                            <FormDescription>
                              알림을 받을 이메일 주소입니다.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="notifications">
                  <AccordionTrigger>알림 설정</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="lowStockNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                부족 재고 알림
                              </FormLabel>
                              <FormDescription>
                                재고가 최소 수량 이하로 떨어질 때 알림을 받습니다.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="data">
                  <AccordionTrigger>데이터 관리</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="autoBackup"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                자동 백업
                              </FormLabel>
                              <FormDescription>
                                매일 시스템 데이터를 자동으로 백업합니다.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            데이터 초기화
                          </FormLabel>
                          <FormDescription>
                            모든 재고 데이터를 초기화합니다. 이 작업은 되돌릴 수 없습니다.
                          </FormDescription>
                        </div>
                        <Button variant="destructive" type="button">
                          초기화
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="coding">
                  <AccordionTrigger>코드 설정</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="codePrefix"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>코드 접두사</FormLabel>
                            <FormControl>
                              <Input {...field} maxLength={3} />
                            </FormControl>
                            <FormDescription>
                              자재 코드에 사용될 접두사입니다. 비워두면 기본값이 사용됩니다.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <CardFooter className="px-0 pt-4 flex justify-end">
                <Button 
                  type="submit" 
                  className="flex items-center"
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? (
                    <span className="material-icons text-sm mr-2 animate-spin">sync</span>
                  ) : (
                    <span className="material-icons text-sm mr-2">save</span>
                  )}
                  설정 저장
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
