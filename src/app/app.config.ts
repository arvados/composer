import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import {Observable} from "rxjs/Observable";
import {ReplaySubject} from "rxjs/ReplaySubject";
import {environment} from '../environments/environment';
import * as yaml from 'js-yaml';

@Injectable()
export class ConfigurationService {

    public configuration : ReplaySubject<Object> = new ReplaySubject(1);
    public discoveryDoc: ReplaySubject<Object> = new ReplaySubject(1);

    constructor(private http: Http) {
        if (!environment.browser || !environment.configPath) { return; }

        var http = this.http;

        var obs = http.get(environment.configPath).map(res => {
            return yaml.safeLoad(res['_body']);
        });

        obs.catch(error => {
            console.error('Something went wrong. Configuration file is missing.');
            return Observable.of("Error");
        });

        obs.flatMap(configuration => {
            this.configuration.next(configuration);
            return http.get(configuration['apiEndPoint']+"/discovery/v1/apis/arvados/v1/rest");
        }).subscribe(res => {
            this.discoveryDoc.next(res.json());
        });
    }
}
