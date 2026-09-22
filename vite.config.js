import { defineConfig } from 'vite';
export default defineConfig({
  server:{host:'0.0.0.0',proxy:{'/room':{target:'ws://127.0.0.1:5175',ws:true,changeOrigin:false},'/health':{target:'http://127.0.0.1:5175'}}},
});
