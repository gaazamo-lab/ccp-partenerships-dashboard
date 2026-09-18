export default {
  singleQuote: true,
  bracketSpacing: true,
  trailingComma: 'all',
  jsxSingleQuote: false,
  proseWrap: 'always',
  printWidth: 100,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: ['^react(.*)', '<THIRD_PARTY_MODULES>', '^@partner-crm/(.*)', '^@/(.*)', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
