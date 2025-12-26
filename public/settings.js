// Gestión de ajustes y fondo personalizado

// Cargar imagen de fondo guardada al iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadBackgroundImage();
    setupSettingsListeners();
});

// Configurar event listeners
function setupSettingsListeners() {
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const selectImageBtn = document.getElementById('selectImageBtn');
    const backgroundImageInput = document.getElementById('backgroundImageInput');
    const removeImageBtn = document.getElementById('removeImageBtn');

    // Abrir modal de ajustes
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('show');
        });
    }

    // Cerrar modal
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('show');
        });
    }

    // Cerrar al hacer clic fuera
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('show');
        }
    });

    // Seleccionar imagen
    if (selectImageBtn) {
        selectImageBtn.addEventListener('click', () => {
            backgroundImageInput.click();
        });
    }

    // Cuando se selecciona una imagen
    if (backgroundImageInput) {
        backgroundImageInput.addEventListener('change', (e) => {
            handleImageSelect(e.target.files[0]);
        });
    }

    // Quitar imagen
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', () => {
            removeBackgroundImage();
        });
    }
}

// Manejar selección de imagen
function handleImageSelect(file) {
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona una imagen válida');
        return;
    }

    // Leer la imagen como base64
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const imageData = e.target.result;
        
        // Mostrar vista previa
        showImagePreview(imageData);
        
        // Guardar en localStorage
        localStorage.setItem('customBackgroundImage', imageData);
        
        // Aplicar a todas las pantallas
        applyBackgroundImage(imageData);
        
        // Mostrar botón de quitar
        document.getElementById('removeImageBtn').style.display = 'block';
        
        // Cerrar modal después de un momento
        setTimeout(() => {
            document.getElementById('settingsModal').classList.remove('show');
        }, 500);
    };
    
    reader.onerror = () => {
        alert('Error al cargar la imagen. Por favor, intenta con otra.');
    };
    
    reader.readAsDataURL(file);
}

// Mostrar vista previa de la imagen
function showImagePreview(imageData) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `<img src="${imageData}" alt="Vista previa">`;
}

// Aplicar imagen de fondo
function applyBackgroundImage(imageData) {
    // Aplicar a la página actual
    document.body.style.backgroundImage = `url(${imageData})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.classList.add('has-custom-bg');
    
    // Guardar en sessionStorage para que otras páginas puedan acceder
    sessionStorage.setItem('customBackgroundImage', imageData);
}

// Cargar imagen de fondo guardada
function loadBackgroundImage() {
    const savedImage = localStorage.getItem('customBackgroundImage');
    if (savedImage) {
        applyBackgroundImage(savedImage);
        
        // Mostrar vista previa si existe el elemento
        const preview = document.getElementById('imagePreview');
        if (preview) {
            showImagePreview(savedImage);
            document.getElementById('removeImageBtn').style.display = 'block';
        }
    }
}

// Quitar imagen de fondo
function removeBackgroundImage() {
    localStorage.removeItem('customBackgroundImage');
    sessionStorage.removeItem('customBackgroundImage');
    
    // Restaurar fondo por defecto
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundRepeat = '';
    document.body.style.backgroundAttachment = '';
    document.body.classList.remove('has-custom-bg');
    
    // Limpiar vista previa
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.innerHTML = '<p>Vista previa</p>';
    }
    
    // Ocultar botón de quitar
    document.getElementById('removeImageBtn').style.display = 'none';
}

