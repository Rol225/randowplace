class YandexMap{
    _id = '';
    _settings = {};
    _isInitialized = false;
    _yMap = null;
    searchControl = null;
    _geolocationControl = null;

    constructor(elementID, options){
        this._id = elementID;
        this._settings = options.settings;

    }

    /**
     * Инициализация карты
     * @private
     */
    _init() {
        this._yMap = new ymaps.Map(this.id, this.settings);
        this.searchControl = new ymaps.control.SearchControl({options: {}});
        this._yMap.controls.add(this.searchControl);
        this._geolocationControl = new ymaps.control.GeolocationControl({});
        this._yMap.controls.add(this.geolocationControl);

        this.geolocationControl.events.add('locationchange', event => {
            this._yMap.setCenter(event.get('position'), 15);
        });
        ymaps.geolocation.get({
            provider: 'browser',
            mapStateAutoApply: true
        }).then(result => {
            this._yMap.setCenter(result.geoObjects.position, 15);
            this._yMap.geoObjects.add(result.geoObjects);
        });


        const checkData = false;
        if(!checkData){
            this._isInitialized = true;
        } else{
            console.error(checkData);
        }
    }

    /**
     * Создание карты
     * @return {Promise<YandexMap>}
     * @public
     */
    createMap() {
        const self = this;
        return new Promise((resolve, reject) => {
            ymaps.ready(() => {
                this._init();
            });

            // Ожидаем инициализации карты
            f(); function f(){
                if(!self.isInitialized) setTimeout(f, 50);
                else resolve(self);
                return;
            }
        });
    }

    searchPlace(address){
        this.searchControl.search(address);
    }

    get yMap() {return this._yMap;}
    get id() {return this._id;}
    get settings() {return this._settings;}
    get isInitialized() {return this._isInitialized;}
    get geolocationControl() {return this._geolocationControl;}
}

