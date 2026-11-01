import { useEffect, type FC } from "react";
import { useAuthStore } from "@/stores/auth";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactTopicOptions } from "@/config/constants/dropdowns/users/contact-topic.options";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { BrandLogo } from "@/components/ui/page-elements";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Routes } from "@/routes/routes";
import { useSendContactMessage } from "@/features/contact/hooks/use-contact";
import { contactSchema, type ContactFormData } from "@/features/contact/validation-schemas/contact.schema";

/** Public Contact Us page. Same card look as the confirmation dialog (icon badge, title, description, footer actions). */
const ContactPage: FC = () => {
  const { t } = useTranslation("contact");
  const send = useSendContactMessage();
  const { isLoggedIn, user } = useAuthStore();
  const locked = isLoggedIn && !!user;
  const account = {
    name: [user?.first_name, user?.last_name].filter(Boolean).join(" "),
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  };
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { ...(locked ? account : { name: "", email: "", phone: "" }), topic: undefined, subject: "", message: "" },
  });

  // Keep the read-only account details in sync (e.g. when the profile loads after the page).
  useEffect(() => {
    if (!locked) return;
    form.setValue("name", account.name);
    form.setValue("email", account.email);
    form.setValue("phone", account.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, account.name, account.email, account.phone]);

  const onSubmit = (values: ContactFormData) =>
    send.mutate({ ...values, phone: values.phone || undefined }, { onSuccess: () => form.reset({ ...(locked ? account : { name: "", email: "", phone: "" }), topic: undefined, subject: "", message: "" }) });

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="mx-auto flex max-w-lg items-center justify-between px-4 pt-6">
        <BrandLogo to={Routes.root} className="!p-0" />
        <LanguageSwitch />
      </header>
      <main className="mx-auto flex max-w-lg flex-col px-4 py-10">
        <div className="grid w-full gap-4 rounded-lg border bg-background p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {send.isSuccess ? <CheckCircle2 className="h-5 w-5" /> : <LifeBuoy className="h-5 w-5" />}
            </div>
            <div className="text-left">
              <h1 className="text-lg font-semibold leading-none tracking-tight">{send.isSuccess ? t("success.title") : t("title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{send.isSuccess ? t("success.description") : t("description")}</p>
            </div>
          </div>

          {send.isSuccess ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" asChild>
                <Link to={Routes.root}>{t("back")}</Link>
              </Button>
              <Button onClick={() => send.reset()}>{t("sendAnother")}</Button>
            </div>
          ) : (
            <Form {...form}>
              <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.name")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("fields.namePlaceholder")} autoComplete="name" {...field} disabled={locked} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.email")}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t("fields.emailPlaceholder")} autoComplete="email" {...field} disabled={locked} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.phone")}</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder={t("fields.phonePlaceholder")} autoComplete="tel" {...field} disabled={locked} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.topic")}</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("fields.topicPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ContactTopicOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.subject")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("fields.subjectPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.message")}</FormLabel>
                      <FormControl>
                        <Textarea rows={6} placeholder={t("fields.messagePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" asChild>
                    <Link to={Routes.root}>{t("cancel")}</Link>
                  </Button>
                  <Button type="submit" loading={send.isPending}>
                    {t("submit")}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </main>
    </div>
  );
};

export default ContactPage;
