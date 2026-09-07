import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        student: resolve(__dirname, 'html/dashboard-student.html'),
        teacher: resolve(__dirname, 'html/dashboard-teacher.html'),
        admin: resolve(__dirname, 'html/dashboard-admin.html'),
        signup: resolve(__dirname, 'html/sign-up.html')
      },
    },
  },
});