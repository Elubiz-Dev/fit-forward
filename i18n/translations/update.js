const fs = require('fs');
const files = ['en.json', 'es.json', 'fr.json', 'de.json', 'it.json', 'pt.json', 'ru.json'];

const socialTranslations = {
  en: {
    title: 'FitGo Social',
    tabs: { you: 'You', feed: 'Community', friends: 'Friends', ranking: 'Ranking', challenges: 'Challenges' },
    you: {
      friends: 'Friends', ranking: 'Ranking', points: 'Points',
      achievements: 'Achievements', viewAllAchievements: 'View all achievements',
      yourPosts: 'Your Posts', noPosts: 'You haven\'t posted anything yet.'
    },
    feed: {
      postPlaceholder: 'What\'s on your mind?', photo: 'Photo',
      noPosts: 'No posts yet.', firstToShare: 'Be the first to share something!',
      like: 'Like', liked: 'Liked', comment: 'Comment', share: 'Share',
      writeComment: 'Write a comment...', edited: '(edited)'
    },
    friends: {
      addFriends: 'Add Friends', searchPlaceholder: 'Name, Email or ID...',
      searchBtn: 'Search', sendRequest: 'Send Request',
      receivedRequests: 'Received Requests', sentRequests: 'Sent Requests',
      pending: 'Pending', myFriends: 'My Friends', noFriends: 'You don\'t have friends yet.'
    },
    ranking: {
      currentRank: 'Your Current Rank', inWorld: 'in the world', points: 'POINTS',
      globalRanking: 'Global Ranking',
      description: 'Compete for consistency. Points are calculated based on your daily logs and achievements.',
      instructionsTitle: 'How to earn points?',
      instructionsDesc: 'Earn points and rank up by completing the following actions:\n• Log a food: 10 points\n• Log an activity: 50 points\n• Complete a challenge: 100 points\n• Unlock an achievement: 100 points\n\nConsistency is key. Keep logging daily to become a FitGo legend!',
      gotIt: 'Got it!'
    },
    challenges: {
      fitgoChallenges: 'FitGo Challenges', suggestAI: 'Fitz Suggestion (AI)',
      acceptChallenge: 'Accept Challenge', newCustomChallenge: 'New Custom Challenge',
      createChallenge: 'Create New Challenge',
      challengeTitle: 'Challenge Title', titlePlaceholder: 'e.g. Iron Week',
      description: 'Description', descPlaceholder: 'Challenge description...',
      type: 'Type', steps: 'Steps', calories: 'Calories', physical: 'Physical',
      days: 'Days', customGoal: 'Custom Goal', customGoalPlaceholder: 'e.g. 100 pushups...',
      targetSteps: 'Target (Steps per day)', targetCalories: 'Target (Calories per day)',
      participants: 'Who is participating?', participantsDesc: 'Tap to select. You can include yourself and multiple friends.',
      me: 'Me', startOnlyMe: '🎯 Start (only me)', startWithFriends: '⚔️ Me + {count} friend(s)',
      challengeFriendsOnly: '⚔️ Challenge {count} friend(s) (without me)', start: '🎯 Start',
      activeChallenges: 'Active Challenges', noActiveChallenges: 'No active challenges.'
    },
    profileModal: {
      fullProfile: 'View Full Profile', areFriends: 'You are Friends',
      pendingRequest: 'Pending Request', addFriend: 'Add Friend', class: 'Class'
    }
  },
  es: {
    title: 'FitGo Social',
    tabs: { you: 'Tú', feed: 'Comunidad', friends: 'Amigos', ranking: 'Ranking', challenges: 'Retos' },
    you: {
      friends: 'Amigos', ranking: 'Ranking', points: 'Puntos',
      achievements: 'Logros', viewAllAchievements: 'Ver todos tus logros',
      yourPosts: 'Tus Publicaciones', noPosts: 'Aún no has publicado nada.'
    },
    feed: {
      postPlaceholder: '¿Qué estás pensando?', photo: 'Foto',
      noPosts: 'Aún no hay publicaciones.', firstToShare: '¡Sé el primero en compartir algo!',
      like: 'Me gusta', liked: 'Te gusta', comment: 'Comentar', share: 'Compartir',
      writeComment: 'Escribe un comentario...', edited: '(editado)'
    },
    friends: {
      addFriends: 'Añadir Amigos', searchPlaceholder: 'Nombre, Email o ID...',
      searchBtn: 'Buscar', sendRequest: 'Enviar Solicitud',
      receivedRequests: 'Solicitudes Recibidas', sentRequests: 'Solicitudes Enviadas',
      pending: 'Pendiente', myFriends: 'Mis Amigos', noFriends: 'Aún no tienes amigos.'
    },
    ranking: {
      currentRank: 'Tu Rango Actual', inWorld: 'del mundo', points: 'PUNTOS',
      globalRanking: 'Ranking Global',
      description: 'Compite por la constancia. Los puntos se calculan basados en tus registros diarios.',
      instructionsTitle: '¿Cómo subir de puntos?',
      instructionsDesc: 'Gana puntos y sube de rango completando estas acciones:\n• Registrar comida: 10 pts\n• Registrar actividad: 50 pts\n• Completar un reto: 100 pts\n• Desbloquear un logro: 100 pts\n\nLa constancia es la clave. ¡Sigue registrando todos los días para ser leyenda en FitGo!',
      gotIt: '¡Entendido!'
    },
    challenges: {
      fitgoChallenges: 'Retos FitGo', suggestAI: 'Sugerencia de Fitz (IA)',
      acceptChallenge: 'Aceptar Reto', newCustomChallenge: 'Nuevo Reto Personalizado',
      createChallenge: 'Crear Nuevo Reto',
      challengeTitle: 'Título del Reto', titlePlaceholder: 'Ej. Semana de Acero',
      description: 'Descripción', descPlaceholder: 'Descripción del reto...',
      type: 'Tipo', steps: 'Pasos', calories: 'Calorías', physical: 'Físico',
      days: 'Días', customGoal: 'Objetivo personalizado', customGoalPlaceholder: 'Ej. Hacer 100 flexiones en total...',
      targetSteps: 'Objetivo (Pasos por día)', targetCalories: 'Objetivo (Calorías por día)',
      participants: '¿Quiénes participan?', participantsDesc: 'Toca para seleccionar. Puedes incluirte a ti y a varios amigos.',
      me: 'Yo', startOnlyMe: '🎯 Comenzar (solo yo)', startWithFriends: '⚔️ Yo + {count} amigo(s)',
      challengeFriendsOnly: '⚔️ Retar a {count} amigo(s) (sin mí)', start: '🎯 Comenzar',
      activeChallenges: 'Retos Activos', noActiveChallenges: 'No hay retos activos.'
    },
    profileModal: {
      fullProfile: 'Ver Perfil Completo', areFriends: 'Son Amigos',
      pendingRequest: 'Solicitud Pendiente', addFriend: 'Añadir Amigo', class: 'Clase'
    }
  },
  fr: {
    title: 'FitGo Social',
    tabs: { you: 'Toi', feed: 'Communauté', friends: 'Amis', ranking: 'Classement', challenges: 'Défis' },
    you: {
      friends: 'Amis', ranking: 'Classement', points: 'Points',
      achievements: 'Succès', viewAllAchievements: 'Voir tous les succès',
      yourPosts: 'Vos publications', noPosts: 'Vous n\'avez encore rien publié.'
    },
    feed: {
      postPlaceholder: 'À quoi pensez-vous ?', photo: 'Photo',
      noPosts: 'Pas encore de publications.', firstToShare: 'Soyez le premier à partager quelque chose !',
      like: 'J\'aime', liked: 'Aimé', comment: 'Commenter', share: 'Partager',
      writeComment: 'Écrire un commentaire...', edited: '(modifié)'
    },
    friends: {
      addFriends: 'Ajouter des amis', searchPlaceholder: 'Nom, E-mail ou ID...',
      searchBtn: 'Rechercher', sendRequest: 'Envoyer la demande',
      receivedRequests: 'Demandes reçues', sentRequests: 'Demandes envoyées',
      pending: 'En attente', myFriends: 'Mes amis', noFriends: 'Vous n\'avez pas encore d\'amis.'
    },
    ranking: {
      currentRank: 'Votre classement actuel', inWorld: 'dans le monde', points: 'POINTS',
      globalRanking: 'Classement mondial',
      description: 'Concourez pour la constance. Les points sont calculés en fonction de vos journaux quotidiens et de vos réussites.',
      instructionsTitle: 'Comment gagner des points ?',
      instructionsDesc: 'Gagnez des points et montez en grade en effectuant les actions suivantes :\n• Enregistrer un repas : 10 points\n• Enregistrer une activité : 50 points\n• Terminer un défi : 100 points\n• Débloquer un succès : 100 points\n\nLa constance est la clé. Continuez à vous connecter quotidiennement pour devenir une légende de FitGo !',
      gotIt: 'Compris !'
    },
    challenges: {
      fitgoChallenges: 'Défis FitGo', suggestAI: 'Suggestion Fitz (IA)',
      acceptChallenge: 'Accepter le défi', newCustomChallenge: 'Nouveau défi personnalisé',
      createChallenge: 'Créer un nouveau défi',
      challengeTitle: 'Titre du défi', titlePlaceholder: 'ex. Semaine de fer',
      description: 'Description', descPlaceholder: 'Description du défi...',
      type: 'Type', steps: 'Pas', calories: 'Calories', physical: 'Physique',
      days: 'Jours', customGoal: 'Objectif personnalisé', customGoalPlaceholder: 'ex. 100 pompes...',
      targetSteps: 'Objectif (Pas par jour)', targetCalories: 'Objectif (Calories par jour)',
      participants: 'Qui participe ?', participantsDesc: 'Appuyez pour sélectionner. Vous pouvez vous inclure et plusieurs amis.',
      me: 'Moi', startOnlyMe: '🎯 Commencer (seulement moi)', startWithFriends: '⚔️ Moi + {count} ami(s)',
      challengeFriendsOnly: '⚔️ Défier {count} ami(s) (sans moi)', start: '🎯 Commencer',
      activeChallenges: 'Défis actifs', noActiveChallenges: 'Aucun défi actif.'
    },
    profileModal: {
      fullProfile: 'Voir le profil complet', areFriends: 'Vous êtes amis',
      pendingRequest: 'Demande en attente', addFriend: 'Ajouter un ami', class: 'Classe'
    }
  },
  de: {
    title: 'FitGo Social',
    tabs: { you: 'Du', feed: 'Gemeinschaft', friends: 'Freunde', ranking: 'Rangliste', challenges: 'Herausforderungen' },
    you: {
      friends: 'Freunde', ranking: 'Rangliste', points: 'Punkte',
      achievements: 'Erfolge', viewAllAchievements: 'Alle Erfolge anzeigen',
      yourPosts: 'Deine Beiträge', noPosts: 'Du hast noch nichts gepostet.'
    },
    feed: {
      postPlaceholder: 'Was denkst du?', photo: 'Foto',
      noPosts: 'Noch keine Beiträge.', firstToShare: 'Sei der Erste, der etwas teilt!',
      like: 'Gefällt mir', liked: 'Gefällt dir', comment: 'Kommentieren', share: 'Teilen',
      writeComment: 'Schreibe einen Kommentar...', edited: '(bearbeitet)'
    },
    friends: {
      addFriends: 'Freunde hinzufügen', searchPlaceholder: 'Name, E-Mail oder ID...',
      searchBtn: 'Suchen', sendRequest: 'Anfrage senden',
      receivedRequests: 'Erhaltene Anfragen', sentRequests: 'Gesendete Anfragen',
      pending: 'Ausstehend', myFriends: 'Meine Freunde', noFriends: 'Du hast noch keine Freunde.'
    },
    ranking: {
      currentRank: 'Dein aktueller Rang', inWorld: 'in der Welt', points: 'PUNKTE',
      globalRanking: 'Globale Rangliste',
      description: 'Wettbewerb um Konsistenz. Punkte werden basierend auf deinen täglichen Protokollen und Erfolgen berechnet.',
      instructionsTitle: 'Wie man Punkte sammelt',
      instructionsDesc: 'Sammle Punkte und steige im Rang auf, indem du folgende Aktionen ausführst:\n• Mahlzeit protokollieren: 10 Punkte\n• Aktivität protokollieren: 50 Punkte\n• Herausforderung abschließen: 100 Punkte\n• Erfolg freischalten: 100 Punkte\n\nKonsistenz ist der Schlüssel. Protokolliere täglich, um eine FitGo-Legende zu werden!',
      gotIt: 'Verstanden!'
    },
    challenges: {
      fitgoChallenges: 'FitGo-Herausforderungen', suggestAI: 'Fitz-Vorschlag (KI)',
      acceptChallenge: 'Herausforderung annehmen', newCustomChallenge: 'Neue benutzerdefinierte Herausforderung',
      createChallenge: 'Neue Herausforderung erstellen',
      challengeTitle: 'Titel der Herausforderung', titlePlaceholder: 'z.B. Eisenwoche',
      description: 'Beschreibung', descPlaceholder: 'Beschreibung der Herausforderung...',
      type: 'Typ', steps: 'Schritte', calories: 'Kalorien', physical: 'Physisch',
      days: 'Tage', customGoal: 'Benutzerdefiniertes Ziel', customGoalPlaceholder: 'z.B. 100 Liegestütze...',
      targetSteps: 'Ziel (Schritte pro Tag)', targetCalories: 'Ziel (Kalorien pro Tag)',
      participants: 'Wer nimmt teil?', participantsDesc: 'Tippen zum Auswählen. Du kannst dich selbst und mehrere Freunde einbeziehen.',
      me: 'Ich', startOnlyMe: '🎯 Starten (nur ich)', startWithFriends: '⚔️ Ich + {count} Freund(e)',
      challengeFriendsOnly: '⚔️ {count} Freund(e) herausfordern (ohne mich)', start: '🎯 Starten',
      activeChallenges: 'Aktive Herausforderungen', noActiveChallenges: 'Keine aktiven Herausforderungen.'
    },
    profileModal: {
      fullProfile: 'Vollständiges Profil anzeigen', areFriends: 'Ihr seid Freunde',
      pendingRequest: 'Ausstehende Anfrage', addFriend: 'Freund hinzufügen', class: 'Klasse'
    }
  },
  it: {
    title: 'FitGo Social',
    tabs: { you: 'Tu', feed: 'Comunità', friends: 'Amici', ranking: 'Classifica', challenges: 'Sfide' },
    you: {
      friends: 'Amici', ranking: 'Classifica', points: 'Punti',
      achievements: 'Traguardi', viewAllAchievements: 'Visualizza tutti i traguardi',
      yourPosts: 'I tuoi post', noPosts: 'Non hai ancora pubblicato nulla.'
    },
    feed: {
      postPlaceholder: 'A cosa stai pensando?', photo: 'Foto',
      noPosts: 'Ancora nessun post.', firstToShare: 'Sii il primo a condividere qualcosa!',
      like: 'Mi piace', liked: 'Ti piace', comment: 'Commenta', share: 'Condividi',
      writeComment: 'Scrivi un commento...', edited: '(modificato)'
    },
    friends: {
      addFriends: 'Aggiungi amici', searchPlaceholder: 'Nome, Email o ID...',
      searchBtn: 'Cerca', sendRequest: 'Invia richiesta',
      receivedRequests: 'Richieste ricevute', sentRequests: 'Richieste inviate',
      pending: 'In attesa', myFriends: 'I miei amici', noFriends: 'Non hai ancora amici.'
    },
    ranking: {
      currentRank: 'Il tuo grado attuale', inWorld: 'nel mondo', points: 'PUNTI',
      globalRanking: 'Classifica globale',
      description: 'Gareggia per la costanza. I punti sono calcolati in base ai tuoi registri giornalieri e ai traguardi.',
      instructionsTitle: 'Come guadagnare punti?',
      instructionsDesc: 'Guadagna punti e sali di grado completando queste azioni:\n• Registra un pasto: 10 punti\n• Registra un\'attività: 50 punti\n• Completa una sfida: 100 punti\n• Sblocca un traguardo: 100 punti\n\nLa costanza è fondamentale. Continua a registrare ogni giorno per diventare una leggenda di FitGo!',
      gotIt: 'Capito!'
    },
    challenges: {
      fitgoChallenges: 'Sfide FitGo', suggestAI: 'Suggerimento Fitz (IA)',
      acceptChallenge: 'Accetta sfida', newCustomChallenge: 'Nuova sfida personalizzata',
      createChallenge: 'Crea nuova sfida',
      challengeTitle: 'Titolo della sfida', titlePlaceholder: 'es. Settimana di ferro',
      description: 'Descrizione', descPlaceholder: 'Descrizione della sfida...',
      type: 'Tipo', steps: 'Passi', calories: 'Calorie', physical: 'Fisico',
      days: 'Giorni', customGoal: 'Obiettivo personalizzato', customGoalPlaceholder: 'es. 100 flessioni...',
      targetSteps: 'Obiettivo (Passi al giorno)', targetCalories: 'Obiettivo (Calorie al giorno)',
      participants: 'Chi partecipa?', participantsDesc: 'Tocca per selezionare. Puoi includere te stesso e più amici.',
      me: 'Io', startOnlyMe: '🎯 Inizia (solo io)', startWithFriends: '⚔️ Io + {count} amic*',
      challengeFriendsOnly: '⚔️ Sfida {count} amic* (senza di me)', start: '🎯 Inizia',
      activeChallenges: 'Sfide attive', noActiveChallenges: 'Nessuna sfida attiva.'
    },
    profileModal: {
      fullProfile: 'Visualizza profilo completo', areFriends: 'Siete amici',
      pendingRequest: 'Richiesta in attesa', addFriend: 'Aggiungi amico', class: 'Classe'
    }
  },
  pt: {
    title: 'FitGo Social',
    tabs: { you: 'Você', feed: 'Comunidade', friends: 'Amigos', ranking: 'Ranking', challenges: 'Desafios' },
    you: {
      friends: 'Amigos', ranking: 'Ranking', points: 'Pontos',
      achievements: 'Conquistas', viewAllAchievements: 'Ver todas as conquistas',
      yourPosts: 'Suas postagens', noPosts: 'Você ainda não postou nada.'
    },
    feed: {
      postPlaceholder: 'No que você está pensando?', photo: 'Foto',
      noPosts: 'Ainda não há postagens.', firstToShare: 'Seja o primeiro a compartilhar algo!',
      like: 'Curtir', liked: 'Curtiu', comment: 'Comentar', share: 'Compartilhar',
      writeComment: 'Escreva um comentário...', edited: '(editado)'
    },
    friends: {
      addFriends: 'Adicionar Amigos', searchPlaceholder: 'Nome, E-mail ou ID...',
      searchBtn: 'Buscar', sendRequest: 'Enviar Solicitação',
      receivedRequests: 'Solicitações Recebidas', sentRequests: 'Solicitações Enviadas',
      pending: 'Pendente', myFriends: 'Meus Amigos', noFriends: 'Você ainda não tem amigos.'
    },
    ranking: {
      currentRank: 'Sua Classificação Atual', inWorld: 'no mundo', points: 'PONTOS',
      globalRanking: 'Ranking Global',
      description: 'Compita pela constância. Os pontos são calculados com base em seus registros diários e conquistas.',
      instructionsTitle: 'Como ganhar pontos?',
      instructionsDesc: 'Ganhe pontos e suba de nível concluindo estas ações:\n• Registrar refeição: 10 pts\n• Registrar atividade: 50 pts\n• Completar desafio: 100 pts\n• Desbloquear conquista: 100 pts\n\nA constância é a chave. Continue registrando diariamente para se tornar uma lenda do FitGo!',
      gotIt: 'Entendi!'
    },
    challenges: {
      fitgoChallenges: 'Desafios FitGo', suggestAI: 'Sugestão do Fitz (IA)',
      acceptChallenge: 'Aceitar Desafio', newCustomChallenge: 'Novo Desafio Personalizado',
      createChallenge: 'Criar Novo Desafio',
      challengeTitle: 'Título do Desafio', titlePlaceholder: 'ex. Semana de Ferro',
      description: 'Descrição', descPlaceholder: 'Descrição do desafio...',
      type: 'Tipo', steps: 'Passos', calories: 'Calorias', physical: 'Físico',
      days: 'Dias', customGoal: 'Objetivo Personalizado', customGoalPlaceholder: 'ex. 100 flexões...',
      targetSteps: 'Objetivo (Passos por dia)', targetCalories: 'Objetivo (Calorias por dia)',
      participants: 'Quem está participando?', participantsDesc: 'Toque para selecionar. Você pode se incluir e a vários amigos.',
      me: 'Eu', startOnlyMe: '🎯 Começar (só eu)', startWithFriends: '⚔️ Eu + {count} amigo(s)',
      challengeFriendsOnly: '⚔️ Desafiar {count} amigo(s) (sem mim)', start: '🎯 Começar',
      activeChallenges: 'Desafios Ativos', noActiveChallenges: 'Nenhum desafio ativo.'
    },
    profileModal: {
      fullProfile: 'Ver Perfil Completo', areFriends: 'Vocês são amigos',
      pendingRequest: 'Solicitação Pendente', addFriend: 'Adicionar Amigo', class: 'Classe'
    }
  },
  ru: {
    title: 'FitGo Social',
    tabs: { you: 'Вы', feed: 'Сообщество', friends: 'Друзья', ranking: 'Рейтинг', challenges: 'Вызовы' },
    you: {
      friends: 'Друзья', ranking: 'Рейтинг', points: 'Очки',
      achievements: 'Достижения', viewAllAchievements: 'Смотреть все достижения',
      yourPosts: 'Ваши публикации', noPosts: 'Вы еще ничего не публиковали.'
    },
    feed: {
      postPlaceholder: 'О чем вы думаете?', photo: 'Фото',
      noPosts: 'Пока нет публикаций.', firstToShare: 'Поделитесь чем-нибудь первым!',
      like: 'Нравится', liked: 'Понравилось', comment: 'Комментировать', share: 'Поделиться',
      writeComment: 'Напишите комментарий...', edited: '(изменено)'
    },
    friends: {
      addFriends: 'Добавить друзей', searchPlaceholder: 'Имя, Email или ID...',
      searchBtn: 'Поиск', sendRequest: 'Отправить запрос',
      receivedRequests: 'Полученные запросы', sentRequests: 'Отправленные запросы',
      pending: 'В ожидании', myFriends: 'Мои друзья', noFriends: 'У вас пока нет друзей.'
    },
    ranking: {
      currentRank: 'Ваш текущий ранг', inWorld: 'в мире', points: 'ОЧКИ',
      globalRanking: 'Глобальный рейтинг',
      description: 'Соревнуйтесь в регулярности. Очки рассчитываются на основе ваших ежедневных записей и достижений.',
      instructionsTitle: 'Как заработать очки?',
      instructionsDesc: 'Зарабатывайте очки и повышайте ранг, выполняя следующие действия:\n• Записать прием пищи: 10 очков\n• Записать активность: 50 очков\n• Выполнить вызов: 100 очков\n• Получить достижение: 100 очков\n\nРегулярность - ключ к успеху. Продолжайте делать записи ежедневно, чтобы стать легендой FitGo!',
      gotIt: 'Понятно!'
    },
    challenges: {
      fitgoChallenges: 'Вызовы FitGo', suggestAI: 'Предложение Fitz (ИИ)',
      acceptChallenge: 'Принять вызов', newCustomChallenge: 'Новый пользовательский вызов',
      createChallenge: 'Создать новый вызов',
      challengeTitle: 'Название вызова', titlePlaceholder: 'напр. Железная неделя',
      description: 'Описание', descPlaceholder: 'Описание вызова...',
      type: 'Тип', steps: 'Шаги', calories: 'Калории', physical: 'Физический',
      days: 'Дни', customGoal: 'Пользовательская цель', customGoalPlaceholder: 'напр. 100 отжиманий...',
      targetSteps: 'Цель (Шагов в день)', targetCalories: 'Цель (Калорий в день)',
      participants: 'Кто участвует?', participantsDesc: 'Нажмите, чтобы выбрать. Вы можете включить себя и несколько друзей.',
      me: 'Я', startOnlyMe: '🎯 Начать (только я)', startWithFriends: '⚔️ Я + {count} друг(а)',
      challengeFriendsOnly: '⚔️ Бросить вызов {count} другу(ам) (без меня)', start: '🎯 Начать',
      activeChallenges: 'Активные вызовы', noActiveChallenges: 'Нет активных вызовов.'
    },
    profileModal: {
      fullProfile: 'Посмотреть полный профиль', areFriends: 'Вы друзья',
      pendingRequest: 'Запрос в ожидании', addFriend: 'Добавить друга', class: 'Класс'
    }
  }
};

files.forEach(file => {
  const lang = file.replace('.json', '');
  if (!socialTranslations[lang]) return;
  
  const path = 'c:/Users/wrait/OneDrive/Desktop/programacion/fitgo/i18n/translations/' + file;
  const content = JSON.parse(fs.readFileSync(path, 'utf8'));
  content.social = socialTranslations[lang];
  
  fs.writeFileSync(path, JSON.stringify(content, null, 2));
  console.log('Updated ' + file);
});
