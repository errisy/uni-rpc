import { Component } from '@angular/core';
import { TestMessage } from './MyService/TestMessage';
import { TestService } from './MyService/TestService';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor (public testClient: TestService) {
  }

  test() {
    let tm: TestMessage = new TestMessage();
    tm.item = 20;
    tm.name = 'black';
    this.testClient.test('jack', 24, tm).subscribe(() => {

    });
  }
}
