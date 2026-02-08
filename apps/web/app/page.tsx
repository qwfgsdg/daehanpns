import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            대한P&S
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            신뢰와 혁신으로 함께하는 파트너
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Link
              href="/register"
              className="block p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
            >
              <div className="text-3xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">회원가입</h2>
              <p className="text-gray-600">
                대한P&S의 회원이 되어 다양한 서비스를 이용하세요
              </p>
            </Link>

            <Link
              href="/login"
              className="block p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
            >
              <div className="text-3xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인</h2>
              <p className="text-gray-600">
                이미 회원이신가요? 로그인하여 서비스를 이용하세요
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
