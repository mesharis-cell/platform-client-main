export interface CityLite {
    id: string;
    name: string;
}

export interface Country {
    id: string;
    name: string;
    cities?: CityLite[];
}

export interface CountryResponse {
    success: boolean;
    data: Country[];
}
