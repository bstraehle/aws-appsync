// Flags JavaScript features the AppSync APPSYNC_JS runtime doesn't support.
import appsync from '@aws-appsync/eslint-plugin';

export default [
  {
    files: ['resolvers/**/*.js'],
    ...appsync.configs.recommended,
    languageOptions: {
      ...appsync.configs.recommended.languageOptions,
      parserOptions: {
        ...appsync.configs.recommended.languageOptions?.parserOptions,
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
