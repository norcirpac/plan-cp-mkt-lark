/** Ai đang dùng app: chọn tay (đã lưu) → khớp tài khoản Lark trong Nhân sự → chưa biết (phải hỏi). */
export function resolveMe({ manualMe, userId, people }) {
  if (manualMe) return { me: manualMe, source: 'manual' };
  const match = userId ? people.find((person) => person.userId === userId) : null;
  if (!match) return { me: '', source: 'none' };
  return { me: match.ten, source: 'lark' };
}
