import { LoginForm } from './login-form';

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return <LoginForm nextUrl={next} />;
}
