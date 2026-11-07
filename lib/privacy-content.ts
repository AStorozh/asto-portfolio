import type { Lang } from "./lang";

// Text of the "About data" page. Kept in code rather than in the database: it changes once a year,
// and this way it's visible in the edit history - for text about data processing that
// matters more than the ability to edit it from the admin.

export type PrivacySection = { title: string; items: string[] };
export type PrivacyContent = {
	label: string;
	title: string;
	subtitle: string;
	updated: string;
	intro: string;
	sections: PrivacySection[];
	contactTitle: string;
	contactText: string;
	contactCta: string;
};

const UPDATED_RU = "4 октября 2026";
const UPDATED_EN = "4 October 2026";
const UPDATED_DE = "4. Oktober 2026";

const ru: PrivacyContent = {
	label: "СТРАНИЦА",
	title: "ПРИВАТНОСТЬ",
	subtitle: "ЧТО СОБИРАЕТСЯ И ЗАЧЕМ",
	updated: `Обновлено ${UPDATED_RU}`,
	intro:
		"Это личный сайт-портфолио. Здесь нет регистрации, корзины и рекламы, поэтому и данных нужно немного. Ниже — честно о том, что происходит, пока вы читаете эти страницы.",
	sections: [
		{
			title: "Статистика посещений",
			items: [
				"Записываются открытые страницы, время на них, язык браузера, тип устройства и примерная страна.",
				"Посетитель определяется необратимым кодом: он вычисляется из адреса и браузера, меняется каждые сутки и восстановить по нему человека нельзя.",
				"Статистика своя, на моём сервере. Ни Google Analytics, ни Яндекс.Метрики, ни рекламных трекеров здесь нет.",
				"Рекламных cookie тоже нет. Браузер хранит только выбранный язык и переписку с ассистентом — и то и другое остаётся на вашем устройстве.",
			],
		},
		{
			title: "AI-ассистент",
			items: [
				"Текст вашего сообщения отправляется в OpenAI, чтобы сформировать ответ. Это внешний сервис, он работает по своим правилам.",
				"История переписки хранится только в вашем браузере. На сервере остаётся обезличенная отметка о самом факте запроса и его стоимости.",
				"Не отправляйте в чат документы и данные, которые не хотели бы показывать третьей стороне.",
			],
		},
		{
			title: "Связь",
			items: [
				"Кнопки контактов ведут в мессенджеры и почту — дальше переписка идёт по правилам этих сервисов, не моим.",
				"Форм обратной связи, которые собирали бы имя и почту, на сайте нет.",
			],
		},
		{
			title: "Проекты в портфолио",
			items: [
				"Часть данных на скриншотах и в описаниях изменена или скрыта: заказчики и их цифры остаются закрытыми.",
				"Материалы носят информационный характер и не являются публичной офертой.",
			],
		},
		{
			title: "Ваши права",
			items: [
				"Статистика обезличена, поэтому выделить в ней именно ваши записи невозможно — как и удалить их по запросу.",
				"Если вы писали мне в мессенджер или на почту, переписку можно удалить: просто попросите.",
			],
		},
	],
	contactTitle: "Остались вопросы?",
	contactText: "Напишите — отвечу и уточню всё, что здесь не раскрыто.",
	contactCta: "Контакты",
};

const en: PrivacyContent = {
	label: "PAGE",
	title: "PRIVACY",
	subtitle: "WHAT IS COLLECTED AND WHY",
	updated: `Updated ${UPDATED_EN}`,
	intro:
		"This is a personal portfolio site. There is no sign-up, no cart and no advertising here, so very little data is needed. Below is a straight account of what happens while you read these pages.",
	sections: [
		{
			title: "Visit statistics",
			items: [
				"Pages you open, time spent on them, browser language, device type and approximate country are recorded.",
				"A visitor is identified by an irreversible code derived from the address and browser; it changes every day. It cannot be traced back to a person.",
				"The statistics are my own and live on my server. No Google Analytics, no Yandex Metrica, no advertising trackers.",
				"There are no advertising cookies either. Your browser only stores the chosen language and the chat history — both stay on your device.",
			],
		},
		{
			title: "AI assistant",
			items: [
				"The text of your message is sent to OpenAI to generate a reply. That is an external service with its own terms.",
				"The conversation is kept only in your browser. The server only records an anonymous note of the request and its cost.",
				"Please do not send documents or details you would not want a third party to see.",
			],
		},
		{
			title: "Getting in touch",
			items: [
				"Contact buttons lead to messengers and email — from there the conversation follows those services' rules, not mine.",
				"There are no contact forms collecting your name or email.",
			],
		},
		{
			title: "Portfolio projects",
			items: [
				"Some data in screenshots and descriptions has been changed or hidden: clients and their numbers stay private.",
				"The materials are informational and do not constitute a public offer.",
			],
		},
		{
			title: "Your rights",
			items: [
				"The statistics are anonymous, so your particular records cannot be singled out — nor deleted on request.",
				"If you wrote to me by messenger or email, that conversation can be deleted: just ask.",
			],
		},
	],
	contactTitle: "Any questions?",
	contactText: "Write to me — I will answer and clarify anything not covered here.",
	contactCta: "Contacts",
};

const de: PrivacyContent = {
	label: "SEITE",
	title: "DATENSCHUTZ",
	subtitle: "WAS ERFASST WIRD UND WARUM",
	updated: `Aktualisiert am ${UPDATED_DE}`,
	intro:
		"Dies ist eine persönliche Portfolio-Website. Es gibt keine Anmeldung, keinen Warenkorb und keine Werbung — entsprechend wenige Daten werden benötigt. Im Folgenden steht ehrlich, was geschieht, während Sie diese Seiten lesen.",
	sections: [
		{
			title: "Besuchsstatistik",
			items: [
				"Erfasst werden geöffnete Seiten, die Verweildauer, die Browsersprache, der Gerätetyp und das ungefähre Land.",
				"Ein Besucher wird über einen nicht umkehrbaren Code erkannt, der aus Adresse und Browser berechnet wird und sich täglich ändert. Eine Person lässt sich daraus nicht ermitteln.",
				"Die Statistik ist meine eigene und liegt auf meinem Server. Kein Google Analytics, keine Yandex Metrica, keine Werbe-Tracker.",
				"Werbe-Cookies gibt es ebenfalls nicht. Der Browser speichert nur die gewählte Sprache und den Chatverlauf — beides bleibt auf Ihrem Gerät.",
			],
		},
		{
			title: "KI-Assistent",
			items: [
				"Der Text Ihrer Nachricht wird an OpenAI gesendet, um eine Antwort zu erzeugen. Das ist ein externer Dienst mit eigenen Bedingungen.",
				"Der Gesprächsverlauf bleibt ausschließlich in Ihrem Browser. Auf dem Server bleibt ein anonymer Vermerk über die Anfrage und ihre Kosten.",
				"Senden Sie bitte keine Unterlagen oder Angaben, die Dritte nicht sehen sollen.",
			],
		},
		{
			title: "Kontakt",
			items: [
				"Die Kontakt-Schaltflächen führen zu Messengern und E-Mail — dort gelten die Regeln dieser Dienste, nicht meine.",
				"Kontaktformulare, die Name oder E-Mail erfassen, gibt es auf der Website nicht.",
			],
		},
		{
			title: "Projekte im Portfolio",
			items: [
				"Ein Teil der Daten in Screenshots und Beschreibungen wurde verändert oder verborgen: Auftraggeber und ihre Zahlen bleiben vertraulich.",
				"Die Inhalte dienen der Information und stellen kein verbindliches Angebot dar.",
			],
		},
		{
			title: "Ihre Rechte",
			items: [
				"Die Statistik ist anonym, daher lassen sich Ihre Einträge weder herausfiltern noch auf Anfrage löschen.",
				"Haben Sie mir per Messenger oder E-Mail geschrieben, kann dieser Verlauf gelöscht werden — sagen Sie einfach Bescheid.",
			],
		},
	],
	contactTitle: "Noch Fragen?",
	contactText: "Schreiben Sie mir — ich antworte und erkläre alles, was hier offen bleibt.",
	contactCta: "Kontakte",
};

export function privacyContent(lang: Lang): PrivacyContent {
	return lang === "en" ? en : lang === "de" ? de : ru;
}
