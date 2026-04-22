// Публичный JSONBin - ключ не нужен
const BIN_ID = '69e8e5e636566621a8de0c1f'; // ЗАМЕНИТЕ НА ВАШ BIN ID
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
        setTimeout(() => {
            if (statusEl.textContent === message) {
                statusEl.textContent = 'Данные синхронизированы';
                statusEl.style.color = '#7c3aed';
            }
        }, 3000);
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
                showSyncStatus('Данные загружены из облака');
            }
        } else {
            throw new Error('Ошибка загрузки');
        }
    } catch (error) {
        const saved = localStorage.getItem('fitnessAppData');
        if (saved) {
            appData = JSON.parse(saved);
            showSyncStatus('Режим офлайн (данные из кэша)', true);
        } else {
            showSyncStatus('Ошибка синхронизации', true);
        }
    }
    
    updatePointsDisplay();
    updateShopUI();
    updatePurchasedList();
}

// Сохранение данных в JSONBin (через API с ключом, но ключ в коде для публичного бина)
// Для публичного бина всё равно нужен ключ на запись, поэтому используем публичный API
// Создайте отдельный бин для записи или используйте этот же с ключом
async function saveDataToCloud() {
    appData.lastUpdated = new Date().toISOString();
    localStorage.setItem('fitnessAppData', JSON.stringify(appData));
    
    if (isSyncing) return;
    isSyncing = true;
    
    try {
        showSyncStatus('Синхронизация...');
        
        // Получаем текущую версию
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
        
        // Обновляем данные
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
            showSyncStatus('Данные синхронизированы');
        } else {
            throw new Error('Ошибка сохранения');
        }
    } catch (error) {
        showSyncStatus('Ошибка синхронизации', true);
    } finally {
        isSyncing = false;
    }
}

// Обновление очков с синхронизацией
async function updatePoints(change) {
    appData.points += change;
    await saveDataToCloud();
}

// Сохранение данных (обертка)
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
    {
        id: 1,
        name: 'Игра в Steam',
        description: 'Любая игра на выбор до 500 рублей',
        price: 300,
        icon: '🎮'
    },
    {
        id: 2,
        name: 'Книга на Литрес',
        description: 'Электронная книга на выбор до 400 рублей',
        price: 250,
        icon: '📚'
    },
    {
        id: 3,
        name: 'Спортивное питание',
        description: 'Протеиновый батончик или изотоник',
        price: 200,
        icon: '💪'
    },
    {
        id: 4,
        name: 'Подписка на Spotify',
        description: 'Месяц премиум-подписки',
        price: 350,
        icon: '🎵'
    },
    {
        id: 5,
        name: 'Смарт-часы',
        description: 'Взнос на покупку смарт-часов',
        price: 500,
        icon: '⌚'
    },
    {
        id: 6,
        name: 'Фитнес-коврик',
        description: 'Качественный коврик для тренировок',
        price: 400,
        icon: '🏋️'
    },
    {
        id: 7,
        name: 'Бутылка для воды',
        description: 'Спортивная бутылка 1л',
        price: 200,
        icon: '💧'
    },
    {
        id: 8,
        name: 'Кинобилет',
        description: 'Билет в кино на любой фильм',
        price: 450,
        icon: '🎬'
    }
];

// Обновление UI магазина
function updateShopUI() {
    const shopContainer = document.getElementById('shopItems');
    if (!shopContainer) return;
    
    shopContainer.innerHTML = shopItems.map(item => {
        const isPurchased = appData.purchasedItems.some(p => p.id === item.id);
        return `
            <div class="shop-item">
                <h4>${item.icon} ${item.name}</h4>
                <div class="shop-item-description">${item.description}</div>
                <div class="shop-item-price">${item.price} очков</div>
                <button 
                    onclick="purchaseItem(${item.id})" 
                    ${isPurchased || appData.points < item.price ? 'disabled' : ''}
                >
                    ${isPurchased ? 'Уже куплено' : 'Купить'}
                </button>
            </div>
        `;
    }).join('');
}

// Покупка предмета
window.purchaseItem = async function(itemId) {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;
    
    if (appData.points < item.price) {
        alert(`Недостаточно очков! Нужно ${item.price} очков, у вас ${appData.points}`);
        return;
    }
    
    if (appData.purchasedItems.some(p => p.id === itemId)) {
        alert('Этот предмет уже куплен!');
        return;
    }
    
    const confirm = window.confirm(`Купить "${item.name}" за ${item.price} очков?`);
    if (!confirm) return;
    
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
    alert(`Поздравляем! Вы приобрели "${item.name}"`);
};

// Обновление списка покупок
function updatePurchasedList() {
    const container = document.getElementById('purchasedList');
    if (!container) return;
    
    if (appData.purchasedItems.length === 0) {
        container.innerHTML = '<div class="info-box">У вас пока нет покупок. Зарабатывайте очки и покупайте призы!</div>';
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

// Обновление отображения очков
function updatePointsDisplay() {
    const pointsEl = document.getElementById('points');
    if (pointsEl) pointsEl.textContent = appData.points;
    const shopPoints = document.getElementById('shopPoints');
    if (shopPoints) shopPoints.textContent = appData.points;
}

// Настройка навигации
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            const activeTab = document.getElementById(tabId);
            if (activeTab) activeTab.classList.add('active');
            
            if (tabId === 'history') {
                updateHistory();
            }
            
            if (tabId === 'shop') {
                updateShopUI();
                updatePurchasedList();
            }
        });
    });
}

// Настройка обработчиков форм
function setupEventListeners() {
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
            
            alert(`Пробежка добавлена! +${points} очков`);
            e.target.reset();
            document.getElementById('runningDate').value = getTodayDate();
            updateHistory();
        });
    }
    
    const pushupsForm = document.getElementById('pushupsForm');
    if (pushupsForm) {
        pushupsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('pushupsDate').value || getTodayDate();
            const count = parseInt(document.getElementById('pushupsCount').value);
            const points = count;
            
            appData.pushups.push({ date, count, points });
            await updatePoints(points);
            
            alert(`Отжимания добавлены! +${points} очков`);
            e.target.reset();
            document.getElementById('pushupsDate').value = getTodayDate();
            updateHistory();
        });
    }
    
    const pullupsForm = document.getElementById('pullupsForm');
    if (pullupsForm) {
        pullupsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('pullupsDate').value || getTodayDate();
            const count = parseInt(document.getElementById('pullupsCount').value);
            const points = count * 2;
            
            appData.pullups.push({ date, count, points });
            await updatePoints(points);
            
            alert(`Подтягивания добавлены! +${points} очков`);
            e.target.reset();
            document.getElementById('pullupsDate').value = getTodayDate();
            updateHistory();
        });
    }
    
    const weightsForm = document.getElementById('weightsForm');
    if (weightsForm) {
        weightsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('weightsDate').value || getTodayDate();
            const weight = parseFloat(document.getElementById('weightKg').value);
            const reps = parseInt(document.getElementById('weightReps').value);
            
            const points = Math.floor(reps / 10);
            
            if (points === 0 && reps > 0) {
                alert(`За ${reps} повторений вы получите 0 очков. Нужно минимум 10 повторений для 1 очка!`);
                return;
            }
            
            appData.weights.push({ date, weight, reps, points });
            await updatePoints(points);
            
            alert(`Тренировка с гантелями добавлена! +${points} очков (${reps} повторений)`);
            e.target.reset();
            document.getElementById('weightsDate').value = getTodayDate();
            updateHistory();
        });
    }
    
    const mealsForm = document.getElementById('mealsForm');
    if (mealsForm) {
        mealsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('mealDate').value || getTodayDate();
            const mealName = document.getElementById('mealName').value;
            const foodType = document.querySelector('input[name="foodType"]:checked').value;
            const isHealthy = foodType === 'healthy';
            const pointsChange = isHealthy ? 5 : -3;
            
            appData.meals.push({ date, mealName, isHealthy, pointsChange });
            await updatePoints(pointsChange);
            
            alert(`Запись добавлена! ${pointsChange > 0 ? '+' : ''}${pointsChange} очков`);
            e.target.reset();
            document.getElementById('mealDate').value = getTodayDate();
            document.querySelector('input[value="healthy"]').checked = true;
            updateHistory();
        });
    }
    
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToMarkdown);
    }
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (confirm('ВНИМАНИЕ! Это действие удалит все данные. Продолжить?')) {
                appData = {
                    running: [],
                    pushups: [],
                    pullups: [],
                    weights: [],
                    meals: [],
                    points: 0,
                    purchasedItems: [],
                    lastUpdated: new Date().toISOString()
                };
                await saveData();
                updatePointsDisplay();
                updateHistory();
                updateShopUI();
                updatePurchasedList();
                alert('Все данные сброшены');
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
        <div class="stat-card">
            <div class="stat-value">${appData.running.length}</div>
            <div class="stat-label">Пробежек</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalDistance.toFixed(1)} км</div>
            <div class="stat-label">Всего дистанция</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalPushups}</div>
            <div class="stat-label">Отжиманий</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalPullups}</div>
            <div class="stat-label">Подтягиваний</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${appData.weights.length}</div>
            <div class="stat-label">Тренировок с гантелями</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalReps}</div>
            <div class="stat-label">Всего повторений</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${healthyMeals}</div>
            <div class="stat-label">Полезных приемов</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${unhealthyMeals}</div>
            <div class="stat-label">Вредных приемов</div>
        </div>
    `;
    const historyStats = document.getElementById('historyStats');
    if (historyStats) historyStats.innerHTML = statsHtml;
    
    const allActivities = [];
    
    appData.running.forEach(item => {
        allActivities.push({
            date: item.date,
            text: `Бег: ${item.distance} км за ${item.duration} мин`,
            points: `+${item.points}`,
            positive: true
        });
    });
    
    appData.pushups.forEach(item => {
        allActivities.push({
            date: item.date,
            text: `Отжимания: ${item.count} раз`,
            points: `+${item.points}`,
            positive: true
        });
    });
    
    appData.pullups.forEach(item => {
        allActivities.push({
            date: item.date,
            text: `Подтягивания: ${item.count} раз`,
            points: `+${item.points}`,
            positive: true
        });
    });
    
    appData.weights.forEach(item => {
        allActivities.push({
            date: item.date,
            text: `Гантели: ${item.weight} кг × ${item.reps} повторений`,
            points: `+${item.points}`,
            positive: true
        });
    });
    
    appData.meals.forEach(item => {
        const type = item.isHealthy ? 'Полезная' : 'Вредная';
        const sign = item.pointsChange > 0 ? '+' : '';
        allActivities.push({
            date: item.date,
            text: `${type} еда: ${item.mealName}`,
            points: `${sign}${item.pointsChange}`,
            positive: item.pointsChange > 0
        });
    });
    
    allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const historyList = document.getElementById('historyList');
    if (historyList) {
        if (allActivities.length === 0) {
            historyList.innerHTML = '<div class="info-box">Нет записей. Добавьте первую тренировку!</div>';
        } else {
            historyList.innerHTML = allActivities.map(activity => `
                <div class="history-item">
                    <div class="history-item-date">${activity.date}</div>
                    <div class="history-item-text">${activity.text}</div>
                    <div class="history-item-points ${activity.positive ? 'points-positive' : 'points-negative'}">
                        ${activity.points} очков
                    </div>
                </div>
            `).join('');
        }
    }
}

// Экспорт в Markdown
function exportToMarkdown() {
    let markdown = `# Fitness Tracker - Отчет\n\n`;
    markdown += `**Дата экспорта:** ${new Date().toLocaleString()}\n\n`;
    markdown += `**Всего очков:** ${appData.points}\n\n`;
    
    markdown += `## Статистика\n\n`;
    const totalDistance = appData.running.reduce((sum, r) => sum + r.distance, 0);
    const totalPushups = appData.pushups.reduce((sum, p) => sum + p.count, 0);
    const totalPullups = appData.pullups.reduce((sum, p) => sum + p.count, 0);
    const totalReps = appData.weights.reduce((sum, w) => sum + w.reps, 0);
    
    markdown += `- Пробежек: ${appData.running.length}\n`;
    markdown += `- Всего дистанция: ${totalDistance.toFixed(1)} км\n`;
    markdown += `- Отжиманий: ${totalPushups}\n`;
    markdown += `- Подтягиваний: ${totalPullups}\n`;
    markdown += `- Тренировок с гантелями: ${appData.weights.length}\n`;
    markdown += `- Всего повторений с гантелями: ${totalReps}\n\n`;
    
    markdown += `## История тренировок\n\n`;
    
    markdown += `### Бег\n`;
    appData.running.forEach(r => {
        markdown += `- ${r.date}: ${r.distance} км за ${r.duration} мин (+${r.points} очков)\n`;
    });
    
    markdown += `\n### Отжимания\n`;
    appData.pushups.forEach(p => {
        markdown += `- ${p.date}: ${p.count} раз (+${p.points} очков)\n`;
    });
    
    markdown += `\n### Подтягивания\n`;
    appData.pullups.forEach(p => {
        markdown += `- ${p.date}: ${p.count} раз (+${p.points} очков)\n`;
    });
    
    markdown += `\n### Гантели\n`;
    appData.weights.forEach(w => {
        markdown += `- ${w.date}: ${w.weight} кг × ${w.reps} повторений (+${w.points} очков)\n`;
    });
    
    markdown += `\n### Питание\n`;
    appData.meals.forEach(m => {
        const type = m.isHealthy ? 'Полезная' : 'Вредная';
        const sign = m.pointsChange > 0 ? '+' : '';
        markdown += `- ${m.date}: ${type} - ${m.mealName} (${sign}${m.pointsChange} очков)\n`;
    });
    
    markdown += `\n### Покупки\n`;
    appData.purchasedItems.forEach(p => {
        markdown += `- ${new Date(p.date).toLocaleDateString()}: ${p.name} (${p.price} очков)\n`;
    });
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness_report_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
}