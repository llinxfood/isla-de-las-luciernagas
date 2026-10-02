export function GuestBar({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="account-bar">
      <span>¿Quieres llevar tu isla a otro dispositivo?</span>
      <button className="text-button" onClick={onEnter}>
        Entrar o crear cuenta
      </button>
    </div>
  );
}
