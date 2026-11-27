import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/proyectos')({
  component: () => <Outlet />,
});
