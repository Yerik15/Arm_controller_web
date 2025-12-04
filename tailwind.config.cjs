/*
 * @Author: _yerik
 * @Date: 2025-12-02 09:51:48
 * @LastEditTime: 2025-12-02 10:04:56
 * @LastEditors: _yerik
 * @Description: 
 * Code. Run. No errors.
 */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: "rgba(15, 23, 42, 0.7)",
      },
      fontFamily: {
        mono: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      }
    },
  },
  plugins: [],
}