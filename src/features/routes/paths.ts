export const paths = {
  home: '/',
  practice: '/practice',
  chat: '/chat',
  session: '/practice/session',
  word: (id: number | string) => `/word/${id}`,
  wordCaseStudy: (id: number | string) => `/word/${id}/practice/case_study`,
};
