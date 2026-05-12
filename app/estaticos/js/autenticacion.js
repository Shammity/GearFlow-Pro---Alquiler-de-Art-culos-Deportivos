// ════════════════════════════════════════════════════════════════════════════════
// AUTENTICACIÓN - Controla login, registro y recuperación de contraseña
// ════════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    
    // Procesa el formulario de login
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(formLogin);
            const data = Object.fromEntries(formData.entries());

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                // Redirigir al index, donde el app.js detectará la sesión
                window.location.href = '/';
            } else {
                alert(result.message);
            }
        });
    }

    // --- LÓGICA DE REGISTRO ---
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const pass = document.getElementById('password').value;
            const confirmPass = document.getElementById('confirm-password').value;

            if (pass !== confirmPass) {
                alert("Las contraseñas no coinciden");
                return;
            }

            const formData = new FormData(formRegistro);
            const data = Object.fromEntries(formData.entries());

            const response = await fetch('/api/auth/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                alert("Registro exitoso. Ahora puedes iniciar sesión.");
                window.location.href = '/auth/login';
            } else {
                alert(result.message);
            }
        });
    }

    // --- LÓGICA DE RECUPERACIÓN ---
    const formRecuperar = document.getElementById('form-recuperar');
    if (formRecuperar) {
        formRecuperar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const correo = document.getElementById('email').value;

            const response = await fetch('/api/auth/recuperar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo })
            });

            const result = await response.json();
            alert(result.message);
            window.location.href = '/auth/login';
        });
    }
});
