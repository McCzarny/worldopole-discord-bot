module.exports = {
    "parserOptions": {
    "ecmaVersion": 2017
  },
    "extends": "google",
    rules: {
        'max-len': [2, {
            code: 120,
            tabWidth: 4,
            ignoreUrls: true,
          }],
  }
};
