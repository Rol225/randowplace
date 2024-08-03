class SelectorInput{
    _input = null;
    _dataList = null;
    _data = [];
    constructor(input, dataList) {
        this._input = input;
        this._dataList = dataList;
        this._bindEvents();
    }

    _bindEvents(){
        this.input.addEventListener("change", this.checkInput.bind(this));
    }

    /**
     * Заполняем массив данных
     * @param optionArray
     */
    fillDataList(optionArray) {
        if(!Array.isArray(optionArray) && !optionArray.length > 0) return;
        this._data = optionArray;
        this.dataList.innerHtml = '';
        optionArray.forEach(option => {
            const el = document.createElement('option');
            el.textContent = option;
            this.dataList.appendChild(el);
        });
    }

    /**
     * Проверка
     * @description Проверяем, что значение есть в dataList
     * @return {String|boolean}
     */
    checkInput(){
        if(this.data.includes(this.input.value)) return this.input.value;
        else return false;
    }

    get input(){return this._input}
    get dataList(){return this._dataList}
    get data(){return this._data}
}

/**
 * Случайное место
 * @api <ul><li>https://overpass-api.de/api/interpreter</li><li>https://api-maps.yandex.ru/2.1</li></ul>
 */
class RandomPlace {
    _allCities = [];
    _allStreets = [];
    _yandexMapApiKey = '';
    _yMap = null;
    constructor(options) {
        if(options.yandexMapApiKey) this._yandexMapApiKey = options.yandexMapApiKey;
    }

    /**
     * Получение всех городов России
     * @param checkCache
     * @api https://overpass-api.de/api/interpreter
     * @return {Promise<string[]>} Список городов
     */
    async getAllCities(checkCache = true) {
        if (checkCache && this.allCities.length > 0) return this.allCities;

        const query = `
        [out:json];
        area["ISO3166-1"="RU"][admin_level=2];
        node[place=city](area);
        out body;`;
        const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const cities = data.elements.map(element => element.tags.name);
            return cities.sort((a, b) => a.localeCompare(b));
        } catch (error) {
            console.error('Ошибка при получении городов:', error);
            throw error;
        }
    }

    /**
     * Получение всех улиц города
     * @param cityName
     * @api https://overpass-api.de/api/interpreter
     * @return {Promise<any[]>}
     */
    async getAllStreets(cityName) {
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const query = `
        [out:json];
        area[name="${cityName}"]->.searchArea;
        (
         way["highway"="residential"](area.searchArea);
         way["highway"="primary"](area.searchArea);
         way["highway"="secondary"](area.searchArea);
         way["highway"="tertiary"](area.searchArea);
         way["highway"="unclassified"](area.searchArea);
         way["highway"="service"](area.searchArea);
         way["highway"="living_street"](area.searchArea);
        );
        out body;
        >;
        out skel qt;
    `;

        try {
            const response = await fetch(overpassUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `data=${encodeURIComponent(query)}`
            });

            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }

            const data = await response.json();

            const streets = data.elements
                .filter(element => element.tags && element.tags.name)
                .map(element => element.tags.name);

            return [...new Set(streets)];
        } catch (error) {
            console.error('There has been a problem with your fetch operation:', error);
        }
    }

    /**
     * Получение всех домов на определённой улице определённого города
     * @param cityName
     * @param street
     * @api https://overpass-api.de/api/interpreter
     * @return {Promise<*>}
     */
    async getAllHouses(cityName, street) {
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const query = `
        [out:json];
        area[name="${cityName}"]->.searchArea;
        (
         node["addr:street"="${street}"](area.searchArea);
         way["addr:street"="${street}"](area.searchArea);
         relation["addr:street"="${street}"](area.searchArea);
        );
        out body;
    `;

        try {
            const response = await fetch(overpassUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `data=${encodeURIComponent(query)}`
            });

            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }

            const data = await response.json();

            return data.elements
                .filter(element => element.tags && element.tags['addr:housenumber'])
                .map(element => element.tags['addr:housenumber']);
        } catch (error) {
            console.error('There has been a problem with your fetch operation:', error);
        }
    }

    /**
     * Получение случайного адреса
     * @param cityName
     * @api <ul><li>https://overpass-api.de/api/interpreter</li><li>https://api-maps.yandex.ru/2.1</li></ul>
     * @return {Promise<Object>}
     */
    async getRandomAddress(cityName) {
        return new Promise((resolve, reject) => {
            this.getAllStreets(cityName).then(streets => {
                const randomStreet = streets[Math.floor(Math.random() * streets.length)];
                this.getAllHouses(cityName, randomStreet).then(houses => {
                    if(houses.length < 1){
                        this.getRandomAddress(cityName).then(result => {
                            resolve(result);
                        }, error => {
                            reject(error);
                        });
                        return;
                    }
                    const randomHouse = houses[Math.floor(Math.random() * houses.length)];
                    ymaps.geocode(`${cityName}, ${randomStreet}, ${randomHouse}`).then(result => {
                        const coordinates = result.geoObjects.get(0).geometry.getCoordinates();
                        resolve({
                            cityName: cityName,
                            street: randomStreet,
                            house: randomHouse,
                            address: `${cityName}, ${randomStreet}, ${randomHouse}`,
                            yandexMapLink: `https://yandex.ru/maps/?text=${encodeURIComponent(`${cityName}, ${randomStreet}, ${randomHouse}`)}`,
                            coordinates: coordinates
                        });
                    }).catch(error => {
                        resolve({
                            cityName: cityName,
                            street: randomStreet,
                            house: randomHouse,
                            address: `${cityName}, ${randomStreet}, ${randomHouse}`,
                            yandexMapLink: `https://yandex.ru/maps/?text=${encodeURIComponent(`${cityName}, ${randomStreet}, ${randomHouse}`)}`,
                            coordinates: []
                        });
                    });
                }).catch(error => {
                    console.error('getAllHouses error:', error);
                    reject(error);
                });
            }).catch(error => {
                console.error('getAllStreets error:', error);
                reject(error);
            });
        });
    }


    get allCities(){return this._allCities;}
    get allStreets(){return this._allStreets;}
    get yandexMapApiKey(){return this._yandexMapApiKey;}
    get yMap(){return this._yMap;}
}


class Spinner {
    el = null;
    title = null;
    intervalId = null; // Добавим свойство для хранения ID интервала

    constructor(el) {
        this.el = el;
        this.title = this.el.querySelector('.spinner__title');
    }

    changeText(textArrays) {
        let outerIndex = 0;
        let innerIndex = 0;

        // Очищаем предыдущий интервал, если он был установлен
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        // Устанавливаем новый интервал
        this.title.innerText = textArrays[outerIndex][innerIndex];
        innerIndex = (innerIndex + 1) % textArrays[outerIndex].length;
        this.intervalId = setInterval(() => {
            if (this.el.classList.contains("active")) {
                const currentArray = textArrays[outerIndex];
                this.title.innerText = currentArray[innerIndex];
                innerIndex = (innerIndex + 1) % currentArray.length;

                // Если мы прошли весь текущий массив, переходим к следующему
                if (innerIndex === 0) {
                    outerIndex = (outerIndex + 1) % textArrays.length;
                }
            } else {
                clearInterval(this.intervalId);
            }
        }, 2000);
    }

    show() {
        this.el.classList.add("active");
    }

    hide() {
        this.el.classList.remove("active");
        // Очищаем интервал при скрытии спиннера
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}