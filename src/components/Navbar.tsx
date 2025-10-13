export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-indigo-900 shadow-md">
      <h1 className="text-2xl font-extrabold text-white tracking-wide">
        KryptoVault
      </h1>
      <ul className="flex gap-6 text-gray-200">
        <li><a href="#" className="hover:text-purple-400">Home</a></li>
        <li><a href="#" className="hover:text-purple-400">Plans</a></li>
        <li><a href="#" className="hover:text-purple-400">About</a></li>
        <li><a href="#" className="hover:text-purple-400">Contact</a></li>
      </ul>
    </nav>
  );
}
