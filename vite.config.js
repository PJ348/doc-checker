import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        student: resolve(__dirname, 'html/dashboard-student.html'),
        dashboardProject: resolve(__dirname, 'html/dashboard-project.html'),
        dashboardProjectTh: resolve(__dirname, 'html/dashboard-project-th.html'),
        teacher: resolve(__dirname, 'html/dashboard-teacher.html'),
        admin: resolve(__dirname, 'html/dashboard-admin.html'),
        signup: resolve(__dirname, 'html/sign-up.html'),
        forgotPassword: resolve(__dirname, 'html/forgot-password.html'),
        updatePassword: resolve(__dirname, 'html/update-password.html'),
        completeProfile: resolve(__dirname, 'html/complete-profile.html')
      },
    },
  },
});