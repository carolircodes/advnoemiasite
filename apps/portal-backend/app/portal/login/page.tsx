import LoginPage, { metadata } from "@/app/auth/login/page";

export { metadata };

export default function PortalLoginPage(props: Parameters<typeof LoginPage>[0]) {
  return <LoginPage {...props} />;
}
