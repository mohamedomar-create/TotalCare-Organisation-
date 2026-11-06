export default function PrivacyNotice() {
  return (
    <div className="notice">
      <strong>Who sees your answers? · مين بيشوف إجاباتك؟</strong>
      <ul>
        <li>At the end you choose: <strong>with your name</strong> (only the project admin sees it) or <strong>anonymously</strong> (stored with no name — nobody can link it to you).</li>
        <li>Management sees a <strong>summary without names</strong>. Teams with fewer than 3 answers are grouped so nobody can be identified.</li>
        <li>We only ask which department you’re in — nothing else about you.</li>
        <li>Your draft saves automatically. After you send it, it is locked.</li>
      </ul>
      <p className="ar-line" lang="ar" dir="rtl">
        في الآخر بتختار: باسمك (مسؤول المشروع بس اللي يشوفه) أو من غير اسم (محدش يقدر يعرف إنها إجابتك). الإدارة بتشوف ملخص من غير أسماء.
      </p>
    </div>
  )
}
