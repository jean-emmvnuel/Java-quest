// Logo Java Quest : le point-virgule héros (symbole) et le nom.
// Fichiers sources : design/logo/final/ — copies servies depuis public/brand/.
export default function Logo() {
  return (
    <a className="logo" href="/" aria-label="Java Quest, accueil">
      <img className="logo-full" src="/brand/javaquest-horizontal.svg" alt="Java Quest" height="40" />
      <img className="logo-symbol" src="/brand/javaquest-symbol.svg" alt="Java Quest" height="44" />
    </a>
  );
}
