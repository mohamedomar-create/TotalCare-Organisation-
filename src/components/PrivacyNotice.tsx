export default function PrivacyNotice() {
  return (
    <div className="notice">
      <strong>Who sees your answers?</strong>
      <ul>
        <li>Only the <strong>project admin</strong> sees your name.</li>
        <li>Management sees a <strong>summary without names</strong>. Small teams are grouped so nobody can be identified.</li>
        <li>You can change a draft any time. After you send it, it is locked.</li>
      </ul>
      <p className="ar-line" lang="ar" dir="rtl">
        اسمك يظهر لمسؤول المشروع فقط. الإدارة تشوف ملخص من غير أسماء. تقدر تعدّل المسودة في أي وقت، وبعد الإرسال مش هتتعدّل.
      </p>
    </div>
  )
}
