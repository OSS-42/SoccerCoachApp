/// <reference types="vite/client" />

declare const __APP_VERSION__: string

declare module '*.mp4' {
  const src: string
  export default src
}
