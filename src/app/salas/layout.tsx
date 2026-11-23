import { GlobalMenu } from "@/components/site";

/** Todas las salas comparten el menú global del museo. */
export default function SalasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalMenu />
      {children}
    </>
  );
}
