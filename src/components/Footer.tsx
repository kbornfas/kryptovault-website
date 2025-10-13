export default function Footer() {
  return (
    <footer className="text-center py-6 bg-indigo-950 text-gray-400 border-t border-gray-800">
      © {new Date().getFullYear()} <span className="text-purple-400">KryptoVault</span>. All Rights Reserved.
    </footer>
  );
}
