// Attend que le DOM soit entièrement chargé pour exécuter le script  
document.addEventListener('DOMContentLoaded', () => {  
  
    // --- VARIABLES GLOBALES ---  
    const mapElement = document.getElementById('map');  
    const placesList = document.getElementById('places-list');  
    const geolocateBtn = document.getElementById('geolocate-btn');  
    const formDialog = document.getElementById('form-dialog');  
    const placeForm = document.getElementById('place-form');  
    const cancelBtn = document.getElementById('cancel-btn');  
  
    let map;  
    let places = []; // Le tableau qui contiendra nos objets "lieu"  
    let markersLayer = L.layerGroup(); // Un groupe pour gérer les marqueurs facilement  
  
    const ICONS = {  
        restaurant: '🍔', bar: '🍺', culture: '🏛️',  
        parc: '🌳', shopping: '🛍️', autre: '⭐'  
    };  
  
  
    // --- FONCTIONS PRINCIPALES ---  
  
    /**  
     * Initialise la carte Leaflet, les écouteurs d'événements et charge les données.  
     */  
    function init() {  
        initMap();  
        loadPlaces();  
  
        // Écouteurs d'événements  
        geolocateBtn.addEventListener('click', geolocateUser);  
        placeForm.addEventListener('submit', handleFormSubmit);  
        cancelBtn.addEventListener('click', () => formDialog.close());  
        placesList.addEventListener('click', handleListClick); // Délégation d'événement  
        map.on('click', onMapClick);  
    }  
  
    /**  
     * Initialise la carte Leaflet avec une vue par défaut et la couche de tuiles.  
     */  
    function initMap() {  
        map = L.map(mapElement).setView([48.8566, 2.3522], 12); // Vue sur Paris par défaut  
  
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {  
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'  
        }).addTo(map);  
          
        markersLayer.addTo(map);  
    }  
  
    /**  
     * Gère la soumission du formulaire pour ajouter ou modifier un lieu.  
     * @param {Event} e L'événement de soumission.  
     */  
    function handleFormSubmit(e) {  
        e.preventDefault();  
        const formData = new FormData(placeForm);  
        const placeId = formData.get('place-id');  
          
        const placeData = {  
            id: placeId ? Number(placeId) : Date.now(), // Conserve l'ID si modification  
            name: formData.get('place-name'),  
            type: formData.get('place-type'),  
            rating: parseInt(formData.get('place-rating'), 10),  
            comment: formData.get('place-comment'),  
            lat: parseFloat(formData.get('latitude')),  
            lng: parseFloat(formData.get('longitude'))  
        };  
  
        if (placeId) {  
            // Modification : trouve l'index et remplace  
            const index = places.findIndex(p => p.id === placeData.id);  
            places[index] = placeData;  
        } else {  
            // Ajout : pousse le nouvel objet dans le tableau  
            places.push(placeData);  
        }  
  
        savePlaces();  
        renderUI();  
        formDialog.close();  
    }  
  
  
    // --- GESTION DES DONNÉES (localStorage) ---  
  
    /**  
     * Sauvegarde le tableau `places` dans le localStorage.  
     */  
    function savePlaces() {  
        localStorage.setItem('myPlaces', JSON.stringify(places));  
    }  
  
    /**  
     * Charge les lieux depuis le localStorage et met à jour l'interface.  
     */  
    function loadPlaces() {  
        const storedPlaces = localStorage.getItem('myPlaces');  
        if (storedPlaces) {  
            places = JSON.parse(storedPlaces);  
            renderUI();  
        }  
    }  
  
  
    // --- GESTION DE L'INTERFACE (RENDU) ---  
  
    /**  
     * Fonction principale pour mettre à jour l'affichage (liste et carte).  
     */  
    function renderUI() {  
        renderPlacesList();  
        renderMapMarkers();  
    }  
  
    /**  
     * Efface et ré-affiche tous les lieux dans la liste HTML.  
     */  
    function renderPlacesList() {  
        placesList.innerHTML = '';  
        if (places.length === 0) {  
            placesList.innerHTML = '<li>Aucun lieu enregistré.</li>';  
            return;  
        }  
        places.forEach(place => {  
            const li = document.createElement('li');  
            li.className = 'place-item';  
            li.dataset.id = place.id;  
  
            li.innerHTML = `  
                <h3>${ICONS[place.type] || '⭐'} ${place.name}</h3>  
                <div class="details">  
                    <span>Note : ${'★'.repeat(place.rating)}${'☆'.repeat(5 - place.rating)}</span>  
                </div>  
                ${place.comment ? `<p class="comment">"${place.comment}"</p>` : ''}  
                <div class="actions">  
                    <button class="btn-edit btn secondary-btn">Modifier</button>  
                    <button class="btn-delete btn secondary-btn">Supprimer</button>  
                </div>  
            `;  
            placesList.appendChild(li);  
        });  
    }  
  
    /**  
     * Efface et ré-affiche tous les marqueurs sur la carte.  
     */  
    function renderMapMarkers() {  
        markersLayer.clearLayers(); // Efface tous les anciens marqueurs  
        places.forEach(place => {  
            const marker = L.marker([place.lat, place.lng]);  
            const popupContent = `  
                <b>${ICONS[place.type] || '⭐'} ${place.name}</b><br>  
                Note: ${'★'.repeat(place.rating)}<br>  
                ${place.comment || ''}  
            `;  
            marker.bindPopup(popupContent);  
            markersLayer.addLayer(marker);  
        });  
    }  
  
  
    // --- GESTIONNAIRES D'ÉVÉNEMENTS ---  
  
    /**  
     * Affiche le formulaire pré-rempli avec les coordonnées après un clic sur la carte.  
     * @param {Object} e Événement de clic de Leaflet.  
     */  
    function onMapClick(e) {  
        showForm(e.latlng.lat, e.latlng.lng);  
    }  
  
    /**  
     * Gère la géolocalisation de l'utilisateur.  
     */  
    function geolocateUser() {  
        navigator.geolocation.getCurrentPosition(position => {  
            const { latitude, longitude } = position.coords;  
            map.setView([latitude, longitude], 15);  
            showForm(latitude, longitude);  
        }, () => {  
            alert("La géolocalisation a échoué. Assurez-vous d'avoir donné l'autorisation.");  
        });  
    }  
      
    /**  
     * Gère les clics sur les boutons "Modifier" ou "Supprimer" de la liste.  
     * @param {Event} e L'événement de clic.  
     */  
    function handleListClick(e) {  
        const target = e.target;  
        const placeItem = target.closest('.place-item');  
        if (!placeItem) return;  
  
        const placeId = Number(placeItem.dataset.id);  
          
        if (target.classList.contains('btn-edit')) {  
            editPlace(placeId);  
        } else if (target.classList.contains('btn-delete')) {  
            deletePlace(placeId);  
        }  
    }  
  
  
    // --- ACTIONS ---  
  
    /**  
     * Ouvre le formulaire pour ajout ou modification.  
     * @param {number} lat - Latitude du lieu.  
     * @param {number} lng - Longitude du lieu.  
     * @param {object|null} placeToEdit - L'objet lieu à modifier, ou null pour un ajout.  
     */  
    function showForm(lat, lng, placeToEdit = null) {  
        placeForm.reset();  
          
        if (placeToEdit) {  
            document.getElementById('form-title').textContent = 'Modifier l\'adresse';  
            document.getElementById('place-id').value = placeToEdit.id;  
            document.getElementById('place-name').value = placeToEdit.name;  
            document.getElementById('place-type').value = placeToEdit.type;  
            document.getElementById('place-rating').value = placeToEdit.rating;  
            document.getElementById('place-comment').value = placeToEdit.comment;  
        } else {  
            document.getElementById('form-title').textContent = 'Ajouter une nouvelle adresse';  
            document.getElementById('place-id').value = ''; // Important pour la logique d'ajout  
        }  
  
        // Toujours remplir les coordonnées  
        document.getElementById('latitude').value = lat;  
        document.getElementById('longitude').value = lng;  
          
        formDialog.showModal();  
    }  
      
    /**  
     * Prépare la modification d'un lieu en ouvrant le formulaire avec ses données.  
     * @param {number} id L'ID du lieu à modifier.  
     */  
    function editPlace(id) {  
        const place = places.find(p => p.id === id);  
        if (place) {  
            showForm(place.lat, place.lng, place);  
        }  
    }  
  
    /**  
     * Supprime un lieu après confirmation.  
     * @param {number} id L'ID du lieu à supprimer.  
     */  
    function deletePlace(id) {  
        if (confirm("Êtes-vous sûr de vouloir supprimer ce lieu ?")) {  
            places = places.filter(p => p.id !== id);  
            savePlaces();  
            renderUI();  
        }  
    }  
  
  
    // --- DÉMARRAGE DE L'APPLICATION ---  
    init();  
  
});  
