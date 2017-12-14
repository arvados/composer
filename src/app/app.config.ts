import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import {Observable} from "rxjs/Observable";
import * as yaml from 'js-yaml';

@Injectable()
export class ConfigurationService {

    public static configuration: Object
    public static discoveryDoc: Object

    constructor(private http: Http) { }

    load(configurationPath: string): Promise<Object> {
        var http = this.http;

        var obs = http.get(configurationPath).map(res => {
            return yaml.safeLoad(res['_body']);
        });

        obs.catch(error => {
            console.error('Something went wrong. Configuration file is missing.');
            return Observable.of("Error");
        });

        return obs.flatMap(configuration => {
            ConfigurationService.configuration = configuration;
            return http.get(configuration['apiEndPoint']+"/discovery/v1/apis/arvados/v1/rest");
        }).map(res => {
            ConfigurationService.discoveryDoc = res.json();
            return ConfigurationService.configuration;
        }).toPromise();
    }
}
