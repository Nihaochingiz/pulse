// Публичный JSONBin - ключ не нужен
const BIN_ID = '69e8e5e636566621a8de0c1f';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`;

// Хранилище данных
let appData = {
    running: [],
    pushups: [],
    pullups: [],
    weights: [],
    meals: [],
    points: 0,
    purchasedItems: [],
    lastUpdated: new Date().toISOString()
};

let isSyncing = false;

// Получение сегодняшней даты
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// Установка сегодняшней даты для всех полей
function setDefaultDates() {
    const today = getTodayDate();
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.value = today;
    });
}

// Показать статус синхронизации
function showSyncStatus(message, isError = false) {
    const statusEl = document.getElementById('syncStatus');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.color = isError ? '#dc2626' : '#7c3aed';
    }
}

// Загрузка данных из публичного JSONBin
async function loadDataFromCloud() {
    try {
        showSyncStatus('Загрузка данных...');
        const response = await fetch(JSONBIN_URL);
        
        if (response.ok) {
            const data = await response.json();
            if (data) {
                appData = data;
                localStorage.setItem('fitnessAppData', JSON.stringify(appData));
                showSyncStatus('Данные загружены');
            }
        } else {
            throw new Error('Ошибка загрузки');
        }
    } catch (error) {
        const saved = localStorage.getItem('fitnessAppData');
        if (saved) {
            appData = JSON.parse(saved);
            showSyncStatus('Офлайн режим', true);
        } else {
            showSyncStatus('Ошибка синхронизации', true);
        }
    }
    
    updatePointsDisplay();
    updateShopUI();
    updatePurchasedList();
}

// Сохранение данных
async function saveDataToCloud() {
    appData.lastUpdated = new Date().toISOString();
    localStorage.setItem('fitnessAppData', JSON.stringify(appData));
    
    if (isSyncing) return;
    isSyncing = true;
    
    try {
        showSyncStatus('Синхронизация...');
        
        const getResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            headers: {
                'X-Master-Key': '$2a$10$rouTDYZgAQxjn9cwYdQHveCpBWHsF09z23xXDep0qNaqEVlAgzsSe'
            }
        });
        
        let currentVersion = null;
        if (getResponse.ok) {
            const data = await getResponse.json();
            currentVersion = data.metadata.version;
        }
        
        const updateResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': '$2a$10$rouTDYZgAQxjn9cwYdQHveCpBWHsF09z23xXDep0qNaqEVlAgzsSe',
                'X-Bin-Version': currentVersion || 'latest'
            },
            body: JSON.stringify(appData)
        });
        
        if (updateResponse.ok) {
            showSyncStatus('Синхронизировано');
        }
    } catch (error) {
        showSyncStatus('Ошибка синхронизации', true);
    } finally {
        isSyncing = false;
    }
}

async function updatePoints(change) {
    appData.points += change;
    await saveDataToCloud();
}

async function saveData() {
    await saveDataToCloud();
    updatePointsDisplay();
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    await loadDataFromCloud();
    setupEventListeners();
    setupNavigation();
    setDefaultDates();
    updateHistory();
});

// Товары в магазине
const shopItems = [
    { id: 1, name: 'Игра в Steam', description: 'Любая игра до 500₽', price: 300, icon: '🎮' },
    { id: 2, name: 'Книга на Литрес', description: 'Электронная книга до 400₽', price: 250, icon: '📚' },
    { id: 3, name: 'Спортивное питание', description: 'Протеиновый батончик', price: 200, icon: '💪' },
    { id: 4, name: 'Подписка Spotify', description: 'Месяц премиум', price: 350, icon: '🎵' },
    { id: 5, name: 'Смарт-часы', description: 'Взнос на покупку', price: 500, icon: '⌚' },
    { id: 6, name: 'Фитнес-коврик', description: 'Качественный коврик', price: 400, icon: '🏋️' },
    { id: 7, name: 'Бутылка для воды', description: 'Спортивная бутылка', price: 200, icon: '💧' },
    { id: 8, name: 'Кинобилет', description: 'Билет в кино', price: 450, icon: '🎬' }
];

function updateShopUI() {
    const container = document.getElementById('shopItems');
    if (!container) return;
    
    container.innerHTML = shopItems.map(item => {
        const isPurchased = appData.purchasedItems.some(p => p.id === item.id);
        return `
            <div class="shop-item">
                <h4>${item.icon} ${item.name}</h4>
                <div class="shop-item-description">${item.description}</div>
                <div class="shop-item-price">${item.price} очков</div>
                <button onclick="purchaseItem(${item.id})" ${isPurchased || appData.points < item.price ? 'disabled' : ''}>
                    ${isPurchased ? 'Куплено' : 'Купить'}
                </button>
            </div>
        `;
    }).join('');
}

window.purchaseItem = async function(itemId) {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;
    
    if (appData.points < item.price) {
        alert(`Не хватает! Нужно ${item.price} очков`);
        return;
    }
    
    if (appData.purchasedItems.some(p => p.id === itemId)) {
        alert('Уже куплено!');
        return;
    }
    
    if (!confirm(`Купить "${item.name}" за ${item.price} очков?`)) return;
    
    appData.points -= item.price;
    appData.purchasedItems.push({
        id: item.id,
        name: item.name,
        price: item.price,
        date: new Date().toISOString()
    });
    
    await saveData();
    updateShopUI();
    updatePurchasedList();
    alert(`Вы купили "${item.name}"!`);
};

function updatePurchasedList() {
    const container = document.getElementById('purchasedList');
    if (!container) return;
    
    if (appData.purchasedItems.length === 0) {
        container.innerHTML = '<div class="info-box">Пока нет покупок</div>';
        return;
    }
    
    container.innerHTML = appData.purchasedItems.map(item => `
        <div class="purchased-item">
            <div>
                <div class="purchased-item-name">${item.name}</div>
                <div class="purchased-item-date">${new Date(item.date).toLocaleDateString()}</div>
            </div>
            <div class="shop-item-price">${item.price} очков</div>
        </div>
    `).join('');
}

function updatePointsDisplay() {
    const pointsEl = document.getElementById('points');
    if (pointsEl) pointsEl.textContent = appData.points;
    const shopPoints = document.getElementById('shopPoints');
    if (shopPoints) shopPoints.textContent = appData.points;
}

// НАСТРОЙКА НАВИГАЦИИ (главное!)
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabs = document.querySelectorAll('.tab');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Убираем активный класс у всех кнопок
            navButtons.forEach(b => b.classList.remove('active'));
            // Добавляем активный класс текущей кнопке
            btn.classList.add('active');
            
            // Скрываем все вкладки
            tabs.forEach(tab => tab.classList.remove('active'));
            // Показываем выбранную вкладку
            const activeTab = document.getElementById(tabId);
            if (activeTab) activeTab.classList.add('active');
            
            // Обновляем контент при необходимости
            if (tabId === 'history') updateHistory();
            if (tabId === 'shop') {
                updateShopUI();
                updatePurchasedList();
            }
        });
    });
}

// Настройка обработчиков форм
function setupEventListeners() {
    // Бег
    const runningForm = document.getElementById('runningForm');
    if (runningForm) {
        runningForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('runningDate').value || getTodayDate();
            const distance = parseFloat(document.getElementById('runningDistance').value);
            const duration = parseInt(document.getElementById('runningDuration').value);
            const points = Math.floor(distance * 10);
            
            appData.running.push({ date, distance, duration, points });
            await updatePoints(points);
            alert(`+${points} очков!`);
            e.target.reset();
            document.getElementById('runningDate').value = getTodayDate();
            updateHistory();
        });
    }
    
    // Отжимания
    const pushupsForm = document.getElementById('pushupsForm');
    if (pushupsForm) {
        pushupsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('pushupsDate').value || getTodayDate();
            const count = parseInt(document.getElementById('pushupsCount').value);
            
            appData.pushups.push({ date, count, points: count });
            await updatePoints(count);
            alert(`+${count} очков!`);
            e.target.reset();
            document.getElementById('pushupsDate').value = getTodayDate();
            updateHistory();
        });
    }
    
    // Подтягивания
    const pullupsForm = document.getElementById('pullupsForm');
    if (pullupsForm) {
        pullupsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('pullupsDate').value || getTodayDate();
            const count = parseInt(document.getElementById('pullupsCount').value);
            const points = count * 2;
            
            appData.pullups.push({ date, count, points });
            await updatePoints(points);
            alert(`+${points} очков!`);
            e.target.reset();
            document.getElementById('pullupsDate').value = getTodayDate();
            updateHistory();
        });
    }
    
    // Гантели
    const weightsForm = document.getElementById('weightsForm');
    if (weightsForm) {
        weightsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('weightsDate').value || getTodayDate();
            const weight = parseFloat(document.getElementById('weightKg').value);
            const reps = parseInt(document.getElementById('weightReps').value);
            const points = Math.floor(reps / 10);
            
            if (points === 0 && reps > 0) {
                alert(`Нужно минимум 10 повторений для 1 очка!`);
                return;
            }
            
            appData.weights.push({ date, weight, reps, points });
            await updatePoints(points);
            alert(`+${points} очков!`);
            e.target.reset();
            document.getElementById('weightsDate').value = getTodayDate();
            updateHistory();
        });
    }
    
    // Питание
    const mealsForm = document.getElementById('mealsForm');
    if (mealsForm) {
        mealsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('mealDate').value || getTodayDate();
            const mealName = document.getElementById('mealName').value;
            const isHealthy = document.querySelector('input[name="foodType"]:checked').value === 'healthy';
            const pointsChange = isHealthy ? 5 : -3;
            
            appData.meals.push({ date, mealName, isHealthy, pointsChange });
            await updatePoints(pointsChange);
            alert(`${pointsChange > 0 ? '+' : ''}${pointsChange} очков!`);
            e.target.reset();
            document.getElementById('mealDate').value = getTodayDate();
            document.querySelector('input[value="healthy"]').checked = true;
            updateHistory();
        });
    }
    
    // Экспорт
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportToMarkdown);
    
    // Сброс
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (confirm('Удалить ВСЕ данные?')) {
                appData = {
                    running: [], pushups: [], pullups: [], weights: [], meals: [],
                    points: 0, purchasedItems: [], lastUpdated: new Date().toISOString()
                };
                await saveData();
                updatePointsDisplay();
                updateHistory();
                updateShopUI();
                updatePurchasedList();
                alert('Данные сброшены');
            }
        });
    }
}

// Обновление истории
function updateHistory() {
    const totalDistance = appData.running.reduce((sum, r) => sum + r.distance, 0);
    const totalPushups = appData.pushups.reduce((sum, p) => sum + p.count, 0);
    const totalPullups = appData.pullups.reduce((sum, p) => sum + p.count, 0);
    const totalReps = appData.weights.reduce((sum, w) => sum + w.reps, 0);
    const healthyMeals = appData.meals.filter(m => m.isHealthy).length;
    const unhealthyMeals = appData.meals.filter(m => !m.isHealthy).length;
    
    const statsHtml = `
        <div class="stat-card"><div class="stat-value">${appData.running.length}</div><div class="stat-label">Пробежек</div></div>
        <div class="stat-card"><div class="stat-value">${totalDistance.toFixed(1)} км</div><div class="stat-label">Дистанция</div></div>
        <div class="stat-card"><div class="stat-value">${totalPushups}</div><div class="stat-label">Отжиманий</div></div>
        <div class="stat-card"><div class="stat-value">${totalPullups}</div><div class="stat-label">Подтягиваний</div></div>
        <div class="stat-card"><div class="stat-value">${appData.weights.length}</div><div class="stat-label">Тренировок с гантелями</div></div>
        <div class="stat-card"><div class="stat-value">${totalReps}</div><div class="stat-label">Повторений</div></div>
        <div class="stat-card"><div class="stat-value">${healthyMeals}</div><div class="stat-label">Полезной еды</div></div>
        <div class="stat-card"><div class="stat-value">${unhealthyMeals}</div><div class="stat-label">Вредной еды</div></div>
    `;
    const historyStats = document.getElementById('historyStats');
    if (historyStats) historyStats.innerHTML = statsHtml;
    
    const allActivities = [];
    appData.running.forEach(i => allActivities.push({ date: i.date, text: `Бег: ${i.distance} км за ${i.duration} мин`, points: `+${i.points}`, positive: true }));
    appData.pushups.forEach(i => allActivities.push({ date: i.date, text: `Отжимания: ${i.count} раз`, points: `+${i.points}`, positive: true }));
    appData.pullups.forEach(i => allActivities.push({ date: i.date, text: `Подтягивания: ${i.count} раз`, points: `+${i.points}`, positive: true }));
    appData.weights.forEach(i => allActivities.push({ date: i.date, text: `Гантели: ${i.weight} кг × ${i.reps} раз`, points: `+${i.points}`, positive: true }));
    appData.meals.forEach(i => {
        const type = i.isHealthy ? 'Полезная' : 'Вредная';
        const sign = i.pointsChange > 0 ? '+' : '';
        allActivities.push({ date: i.date, text: `${type}: ${i.mealName}`, points: `${sign}${i.pointsChange}`, positive: i.pointsChange > 0 });
    });
    allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const historyList = document.getElementById('historyList');
    if (historyList) {
        if (allActivities.length === 0) {
            historyList.innerHTML = '<div class="info-box">Нет записей</div>';
        } else {
            historyList.innerHTML = allActivities.map(a => `
                <div class="history-item">
                    <div class="history-item-date">${a.date}</div>
                    <div class="history-item-text">${a.text}</div>
                    <div class="history-item-points ${a.positive ? 'points-positive' : 'points-negative'}">${a.points} очков</div>
                </div>
            `).join('');
        }
    }
}

// Экспорт в Markdown
function exportToMarkdown() {
    let markdown = `# Fitness Tracker - Отчет\n\n`;
    markdown += `**Дата:** ${new Date().toLocaleString()}\n\n`;
    markdown += `**Очки:** ${appData.points}\n\n`;
    
    markdown += `## Бег\n`;
    appData.running.forEach(r => markdown += `- ${r.date}: ${r.distance} км (+${r.points})\n`);
    markdown += `\n## Отжимания\n`;
    appData.pushups.forEach(p => markdown += `- ${p.date}: ${p.count} раз (+${p.points})\n`);
    markdown += `\n## Подтягивания\n`;
    appData.pullups.forEach(p => markdown += `- ${p.date}: ${p.count} раз (+${p.points})\n`);
    markdown += `\n## Гантели\n`;
    appData.weights.forEach(w => markdown += `- ${w.date}: ${w.weight} кг × ${w.reps} (+${w.points})\n`);
    markdown += `\n## Питание\n`;
    appData.meals.forEach(m => {
        const type = m.isHealthy ? 'Полезная' : 'Вредная';
        const sign = m.pointsChange > 0 ? '+' : '';
        markdown += `- ${m.date}: ${type} - ${m.mealName} (${sign}${m.pointsChange})\n`;
    });
    markdown += `\n## Покупки\n`;
    appData.purchasedItems.forEach(p => markdown += `- ${new Date(p.date).toLocaleDateString()}: ${p.name} (${p.price})\n`);
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness_report_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
}
