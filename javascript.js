// ElecVision - Application professionnelle
// Propriétaire: Aly Bathily
// Version: 2.0

// Variables globales
let canvas;
let isWireMode = false;
let wirePoints = [];
let currentWire = null;
let currentProject = null;
let selectedPaymentMethod = null;
let current3DScene = null;
let current3DCamera = null;
let current3DRenderer = null;

// Configuration des prix (FCFA)
const PRICES = {
    wire_per_meter: 500,
    breaker_box: 25000,
    outlet: 3000,
    switch: 2500,
    light: 4000,
    labor_per_day: 15000,
    water_heater: 75000,
    ac: 150000,
    fan: 25000
};

// Configuration API (à configurer selon votre hébergement)
const API_CONFIG = {
    baseUrl: window.location.origin,
    merchantNumber: '+221781255060'
};

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', function() {
    initCanvas();
    loadProjectsList();
    checkFirstVisit();
    setupAutoSave();
});

function initCanvas() {
    canvas = new fabric.Canvas('canvas', {
        selection: true,
        preserveObjectStacking: true,
        width: 1200,
        height: 800
    });
    
    canvas.setBackgroundColor('white', canvas.renderAll.bind(canvas));
    canvas.on('object:added', updateCalculations);
    canvas.on('object:removed', updateCalculations);
    canvas.on('object:modified', updateCalculations);
    
    setupWireDrawing();
    showNotification('Bienvenue sur ElecVision !', 'success');
}

function setupWireDrawing() {
    canvas.on('mouse:down', function(e) {
        if(!isWireMode) return;
        
        const pointer = canvas.getPointer(e.e);
        wirePoints.push(pointer);
        
        if(wirePoints.length === 1) {
            currentWire = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                stroke: '#48bb78', strokeWidth: 4, selectable: true,
                strokeDashArray: [5, 5]
            });
            canvas.add(currentWire);
        } else if(wirePoints.length === 2) {
            const distance = calculateDistance(wirePoints[0], wirePoints[1]);
            currentWire.set({
                x2: pointer.x,
                y2: pointer.y,
                strokeDashArray: null
            });
            currentWire.data = { type: 'wire', length: distance };
            canvas.renderAll();
            
            wirePoints = [];
            currentWire = null;
            isWireMode = false;
            document.getElementById('drawWireBtn').classList.remove('wire-mode-active');
            showNotification('Câble ajouté avec succès !', 'success');
        }
    });
}

function calculateDistance(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

// Gestion des symboles
function addSymbol(type) {
    let symbol;
    let left = canvas.width / 2;
    let top = canvas.height / 2;
    
    const symbolConfigs = {
        prise: {
            icon: '🔌',
            color: '#e53e3e',
            name: 'Prise électrique',
            price: PRICES.outlet
        },
        interrupteur: {
            icon: '💡',
            color: '#4299e1',
            name: 'Interrupteur',
            price: PRICES.switch
        },
        lampe: {
            icon: '💡',
            color: '#f6e05e',
            name: 'Lampe',
            price: PRICES.light
        },
        tableau: {
            icon: '📊',
            color: '#2d3748',
            name: 'Tableau électrique',
            price: PRICES.breaker_box
        },
        'chauffe-eau': {
            icon: '🔥',
            color: '#dd6b20',
            name: 'Chauffe-eau',
            price: PRICES.water_heater
        },
        clim: {
            icon: '❄️',
            color: '#3182ce',
            name: 'Climatiseur',
            price: PRICES.ac
        },
        ventilateur: {
            icon: '🌀',
            color: '#4299e1',
            name: 'Ventilateur',
            price: PRICES.fan
        }
    };
    
    const config = symbolConfigs[type];
    if(!config) return;
    
    const circle = new fabric.Circle({
        radius: 20,
        fill: config.color,
        stroke: '#fff',
        strokeWidth: 2,
        left: left,
        top: top,
        originX: 'center',
        originY: 'center'
    });
    
    const text = new fabric.Text(config.icon, {
        fontSize: 20,
        left: left - 10,
        top: top - 10,
        originX: 'center',
        originY: 'center'
    });
    
    symbol = new fabric.Group([circle, text], {
        left: left - 20,
        top: top - 20,
        data: { type: type, name: config.name, price: config.price }
    });
    
    canvas.add(symbol);
    canvas.setActiveObject(symbol);
    canvas.renderAll();
    updateCalculations();
    showNotification(`${config.name} ajouté !`, 'success');
}

function activateWireMode() {
    isWireMode = true;
    wirePoints = [];
    document.getElementById('drawWireBtn').classList.add('wire-mode-active');
    showNotification('Mode dessin activé. Cliquez pour tracer les câbles.', 'info');
}

function activateSelectMode() {
    isWireMode = false;
    wirePoints = [];
    document.getElementById('drawWireBtn').classList.remove('wire-mode-active');
    canvas.selection = true;
    canvas.renderAll();
}

function deleteSelected() {
    const activeObject = canvas.getActiveObject();
    if(activeObject) {
        canvas.remove(activeObject);
        canvas.renderAll();
        updateCalculations();
        showNotification('Élément supprimé', 'info');
    }
}

function clearCanvas() {
    if(confirm('Êtes-vous sûr de vouloir tout effacer ?')) {
        canvas.clear();
        canvas.setBackgroundColor('white', canvas.renderAll.bind(canvas));
        wirePoints = [];
        isWireMode = false;
        document.getElementById('drawWireBtn').classList.remove('wire-mode-active');
        updateCalculations();
        showNotification('Nouveau projet créé', 'success');
    }
}

// Calculs automatiques
function calculateTotalWireLength() {
    let totalLength = 0;
    const objects = canvas.getObjects();
    const scale = parseInt(document.getElementById('scale').value) || 10;
    
    objects.forEach(obj => {
        if(obj.type === 'line') {
            let lengthInPixels = 0;
            if(obj.data && obj.data.length) {
                lengthInPixels = obj.data.length;
            } else if(obj.x2 && obj.y2) {
                lengthInPixels = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
            }
            const lengthInMeters = (lengthInPixels / scale) * 100;
            totalLength += lengthInMeters;
        }
    });
    
    return totalLength;
}

function countSymbols() {
    const counts = {
        prise: 0, interrupteur: 0, lampe: 0, tableau: 0,
        'chauffe-eau': 0, clim: 0, ventilateur: 0
    };
    
    const objects = canvas.getObjects();
    objects.forEach(obj => {
        if(obj.data && obj.data.type) {
            counts[obj.data.type] = (counts[obj.data.type] || 0) + 1;
        }
    });
    
    return counts;
}

function updateCalculations() {
    const totalWire = calculateTotalWireLength();
    const symbolCounts = countSymbols();
    const scale = parseInt(document.getElementById('scale').value) || 10;
    
    // Mise à jour des affichages
    document.getElementById('totalLength').innerText = Math.round(totalWire) + ' m';
    
    // Section recommandée selon la norme NFC 15-100
    let wireSection = '2.5 mm²';
    let lightSection = '1.5 mm²';
    if(totalWire > 100) {
        wireSection = '6 mm²';
        lightSection = '2.5 mm²';
    } else if(totalWire > 50) {
        wireSection = '4 mm²';
    }
    
    document.getElementById('wireSection').innerText = wireSection;
    document.getElementById('lightSection').innerText = lightSection;
    
    // Calcul du disjoncteur principal
    let totalPower = (symbolCounts.prise * 2300) + (symbolCounts.clim * 3500) +
                     (symbolCounts['chauffe-eau'] * 3000) + (symbolCounts.lampe * 100);
    let breakerAmps = Math.ceil(totalPower / 230) + 10;
    breakerAmps = Math.min(Math.max(breakerAmps, 20), 63);
    document.getElementById('breakerSize').innerText = breakerAmps + ' A';
    
    // Chute de tension
    const voltageDrop = (totalWire * 0.022 * breakerAmps) / 100;
    document.getElementById('voltageDrop').innerText = voltageDrop.toFixed(2) + '%';
    
    // Calculs des coûts
    const cableCost = totalWire * PRICES.wire_per_meter;
    const materialCost = (symbolCounts.prise * PRICES.outlet) +
                        (symbolCounts.interrupteur * PRICES.switch) +
                        (symbolCounts.lampe * PRICES.light) +
                        (symbolCounts.tableau * PRICES.breaker_box) +
                        (symbolCounts['chauffe-eau'] * PRICES.water_heater) +
                        (symbolCounts.clim * PRICES.ac) +
                        (symbolCounts.ventilateur * PRICES.fan);
    
    const laborDays = Math.ceil(totalWire / 50);
    const laborCost = laborDays * PRICES.labor_per_day;
    const totalCost = cableCost + materialCost + laborCost;
    
    document.getElementById('cableCost').innerText = Math.round(cableCost).toLocaleString() + ' FCFA';
    document.getElementById('materialCost').innerText = Math.round(materialCost).toLocaleString() + ' FCFA';
    document.getElementById('laborCost').innerText = Math.round(laborCost).toLocaleString() + ' FCFA';
    document.getElementById('totalCost').innerText = Math.round(totalCost).toLocaleString() + ' FCFA';
    
    // Génération de la liste du matériel
    updateMaterialList(symbolCounts, totalWire, cableCost, materialCost, laborCost, totalCost);
}

function updateMaterialList(counts, totalWire, cableCost, materialCost, laborCost, totalCost) {
    const materialListDiv = document.getElementById('materialList');
    let html = '<ul style="list-style:none; padding:0;">';
    
    if(totalWire > 0) {
        html += `<li><i class="fas fa-wire"></i> Câble électrique: ${Math.round(totalWire)}m - ${Math.round(cableCost).toLocaleString()} FCFA</li>`;
    }
    
    for(const [type, count] of Object.entries(counts)) {
        if(count > 0) {
            const names = {
                prise: 'Prise électrique',
                interrupteur: 'Interrupteur',
                lampe: 'Lampe',
                tableau: 'Tableau électrique',
                'chauffe-eau': 'Chauffe-eau',
                clim: 'Climatiseur',
                ventilateur: 'Ventilateur'
            };
            html += `<li><i class="fas fa-plug"></i> ${names[type]}: ${count}x - ${(count * PRICES[type === 'prise' ? 'outlet' : type === 'chauffe-eau' ? 'water_heater' : type]).toLocaleString()} FCFA</li>`;
        }
    }
    
    html += `<li><i class="fas fa-tools"></i> Main d'œuvre: ${Math.ceil(totalWire/50)} jours - ${laborCost.toLocaleString()} FCFA</li>`;
    html += `<li class="total" style="margin-top:10px; padding-top:10px; border-top:2px solid #e2e8f0;"><strong>Total: ${totalCost.toLocaleString()} FCFA</strong></li>`;
    html += '</ul>';
    
    materialListDiv.innerHTML = html;
}

// Sauvegarde et chargement des projets
function saveProject() {
    const projectName = prompt('Nom du projet:', `projet_${new Date().getTime()}`);
    if(!projectName) return;
    
    const projectData = {
        id: projectName,
        name: projectName,
        date: new Date().toISOString(),
        canvas: canvas.toJSON(),
        timestamp: new Date().getTime()
    };
    
    // Sauvegarde locale
    localStorage.setItem(`project_${projectName}`, JSON.stringify(projectData));
    
    // Sauvegarde sur le serveur si disponible
    saveToServer(projectData);
    
    loadProjectsList();
    showNotification(`Projet "${projectName}" sauvegardé !`, 'success');
}

function saveToServer(projectData) {
    fetch('backend.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'save',
            project: projectData
        })
    }).catch(err => console.log('Mode offline, sauvegarde locale uniquement'));
}

function loadProjectList() {
    loadProjectsList();
    showSection('projects');
}

function loadProjectsList() {
    const projects = [];
    
    // Charger les projets locaux
    for(let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if(key && key.startsWith('project_')) {
            try {
                const project = JSON.parse(localStorage.getItem(key));
                projects.push(project);
            } catch(e) {}
        }
    }
    
    displayProjects(projects);
}

function displayProjects(projects) {
    const container = document.getElementById('projectsList');
    if(!container) return;
    
    if(projects.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:2rem;">Aucun projet sauvegardé. Créez votre premier projet !</p>';
        return;
    }
    
    let html = '';
    projects.forEach(project => {
        html += `
            <div class="project-card">
                <h3><i class="fas fa-file-alt"></i> ${escapeHtml(project.name)}</h3>
                <p><i class="fas fa-calendar"></i> ${new Date(project.date).toLocaleDateString()}</p>
                <p><i class="fas fa-clock"></i> ${new Date(project.date).toLocaleTimeString()}</p>
                <div class="project-actions">
                    <button onclick="openProject('${project.id}')" class="btn-icon">
                        <i class="fas fa-folder-open"></i> Ouvrir
                    </button>
                    <button onclick="deleteProject('${project.id}')" class="btn-icon" style="background:#fee;">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function openProject(projectId) {
    const projectData = localStorage.getItem(`project_${projectId}`);
    if(projectData) {
        const project = JSON.parse(projectData);
        canvas.loadFromJSON(project.canvas, () => {
            canvas.renderAll();
            updateCalculations();