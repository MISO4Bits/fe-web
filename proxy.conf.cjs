module.exports = {
  '/web/**': {
    target: 'http://localhost:8081',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/web(?=\/|$)/, ''),
  },
};
