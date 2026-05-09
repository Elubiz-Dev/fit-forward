import json
import os

base_path = r'c:\Users\wrait\OneDrive\Desktop\programacion\fitgo\i18n\translations'
en_path = os.path.join(base_path, 'en.json')

with open(en_path, 'r', encoding='utf-8') as f:
    en_data = json.load(f)

# Translations dictionary for missing keys
translations = {
    'fr': {
        'about.moreInfo': "Plus d'informations",
        'profile.settings': "Paramètres",
        'profile.updateGoals': "Mettre à jour objectifs",
        'profile.mealPlanFoods': "Aliments Disponibles",
        'profile.reminders': "Rappels",
        'profile.interface': "Interface",
        'profile.syncMeals': "Synchroniser Repas",
        'profile.account': "Compte",
        'profile.sendFeedback': "Envoyer un avis",
        'profile.updateSuccess': "Profil mis à jour avec succès ✨",
        'profile.roleSuperAdmin': "Super Admin",
        'profile.roleAdmin': "Administrateur",
        'profile.rolePro': "Membre Pro",
        'profile.loseWeightValidation': "Le poids cible doit être inférieur au poids actuel",
        'profile.gainWeightValidation': "Le poids cible doit être supérieur au poids actuel",
        'profile.maintainWeightInfo': "Votre poids cible est fixé à votre poids actuel",
        'profile.currentWeight': "Quel est votre poids actuel ?",
        'dashboard.seeHistory': "Voir l'historique",
        'dashboard.measurementsSub': "Taille, poitrine, etc.",
        'dashboard.achievementsWidget': "Réussites",
        'dashboard.viewAchievements': "Voir les Médailles",
        'dashboard.achievementsSub': "Défis terminés",
        'onboarding.dietTypeTitle': "Quel type de régime préférez-vous ?",
        'onboarding.dietTypeSub': "Sélectionnez l'approche nutritionnelle qui vous convient",
        'onboarding.dietTypeRecommendedTitle': "Recommandé",
        'onboarding.dietTypeRecommendedSub': "Le meilleur pour vous. Mélange optimal de protéines, glucides et lipides",
        'onboarding.dietTypeHighProteinTitle': "Riche en Protéines",
        'onboarding.dietTypeHighProteinSub': "Plus de protéines, moins de glucides et lipides",
        'onboarding.dietTypeLowCarbTitle': "Bas en Glucides",
        'onboarding.dietTypeLowCarbSub': "Moins de glucides, plus de lipides et protéines modérées",
        'onboarding.dietTypeKetoTitle': "Céto",
        'onboarding.dietTypeKetoSub': "Très bas en glucides, riche en lipides et protéines modérées",
        'onboarding.dietTypeLowFatTitle': "Bas en Lipides",
        'onboarding.dietTypeLowFatSub': "Moins de lipides, plus de glucides et protéines modérées",
        'onboarding.personalizeTitle': "Personnalisez votre objectif",
        'onboarding.personalizeSub': "Dernière étape pour connaître vos calories et macros",
        'onboarding.currentWeight': "Poids actuel",
        'onboarding.targetWeight': "Poids cible",
        'onboarding.velocity': "Vélocité",
        'onboarding.velocitySlow': "Conservateur",
        'onboarding.velocityModerate': "Recommandé",
        'onboarding.velocityFast': "Agressif",
        'onboarding.createPlan': "Créer mon plan",
        'planner.noPlanYet': "Vous n'avez pas encore de plan",
        'planner.noWorkouts': "Aucun entraînement planifié",
        'planner.restDay': "Jour de repos",
        'planner.nutritionTab': "Nutrition",
        'planner.restDayHint': "Aujourd'hui est un jour de repos ! Prenez ce temps pour récupérer.",
        'planner.workoutsTab': "Entraînements"
    },
    'it': {
        'about.moreInfo': "Altre informazioni",
        'profile.settings': "Impostazioni",
        'profile.updateGoals': "Aggiorna obiettivi",
        'profile.mealPlanFoods': "Alimenti Disponibili",
        'profile.reminders': "Promemoria",
        'profile.interface': "Interfaccia",
        'profile.syncMeals': "Sincronizza Pasti",
        'profile.account': "Account",
        'profile.sendFeedback': "Invia Feedback",
        'profile.updateSuccess': "Profilo aggiornato con successo ✨",
        'profile.roleSuperAdmin': "Super Admin",
        'profile.roleAdmin': "Amministratore",
        'profile.rolePro': "Membro Pro",
        'profile.loseWeightValidation': "Il peso obiettivo deve essere inferiore a quello attuale",
        'profile.gainWeightValidation': "Il peso obiettivo deve essere superiore a quello attuale",
        'profile.maintainWeightInfo': "Il tuo peso obiettivo è uguale a quello attuale",
        'profile.currentWeight': "Qual è il tuo peso attuale ?",
        'dashboard.seeHistory': "Vedi cronologia",
        'dashboard.measurementsSub': "Vita, petto, ecc.",
        'dashboard.achievementsWidget': "Traguardi",
        'dashboard.viewAchievements': "Vedi Medaglie",
        'dashboard.achievementsSub': "Sfide completate",
        'onboarding.dietTypeTitle': "Che tipo di dieta preferisci?",
        'onboarding.dietTypeSub': "Seleziona l'approccio nutrizionale più adatto a te",
        'onboarding.dietTypeRecommendedTitle': "Raccomandata",
        'onboarding.dietTypeRecommendedSub': "La migliore per te. Mix ottimale di proteine, carboidrati e grassi",
        'onboarding.dietTypeHighProteinTitle': "Alta Proteica",
        'onboarding.dietTypeHighProteinSub': "Più proteine, meno carboidrati e grassi",
        'onboarding.dietTypeLowCarbTitle': "Low Carb",
        'onboarding.dietTypeLowCarbSub': "Meno carboidrati, più grassi e proteine moderate",
        'onboarding.dietTypeKetoTitle': "Chetogenica",
        'onboarding.dietTypeKetoSub': "Bassissimi carboidrati, molti grassi e proteine moderate",
        'onboarding.dietTypeLowFatTitle': "Low Fat",
        'onboarding.dietTypeLowFatSub': "Meno grassi, più carboidrati e proteine moderate",
        'onboarding.personalizeTitle': "Personalizza il tuo obiettivo",
        'onboarding.personalizeSub': "Ultimo passo per conoscere le tue calorie e macro",
        'onboarding.currentWeight': "Peso attuale",
        'onboarding.targetWeight': "Peso obiettivo",
        'onboarding.velocity': "Velocità",
        'onboarding.velocitySlow': "Conservatore",
        'onboarding.velocityModerate': "Raccomandato",
        'onboarding.velocityFast': "Aggressivo",
        'onboarding.createPlan': "Crea il mio piano",
        'planner.noPlanYet': "Non hai ancora un piano",
        'planner.noWorkouts': "Nessun allenamento pianificato",
        'planner.restDay': "Giorno di riposo",
        'planner.nutritionTab': "Nutrizione",
        'planner.restDayHint': "Oggi è un giorno di riposo! Prendi questo tempo per recuperare.",
        'planner.workoutsTab': "Allenamenti"
    },
    'pt': {
        'about.moreInfo': "Mais informações",
        'profile.settings': "Configurações",
        'profile.updateGoals': "Atualizar objetivos",
        'profile.mealPlanFoods': "Alimentos Disponíveis",
        'profile.reminders': "Lembretes",
        'profile.interface': "Interface",
        'profile.syncMeals': "Sincronizar Refeições",
        'profile.account': "Conta",
        'profile.sendFeedback': "Enviar Feedback",
        'profile.updateSuccess': "Perfil atualizado com sucesso ✨",
        'profile.roleSuperAdmin': "Super Admin",
        'profile.roleAdmin': "Administrador",
        'profile.rolePro': "Membro Pro",
        'profile.loseWeightValidation': "O peso pretendido deve ser inferior ao peso atual",
        'profile.gainWeightValidation': "O peso pretendido deve ser superior ao peso atual",
        'profile.maintainWeightInfo': "O seu peso pretendido é igual ao seu peso atual",
        'profile.currentWeight': "Qual é o seu peso atual?",
        'dashboard.seeHistory': "Ver histórico",
        'dashboard.measurementsSub': "Cintura, peito, etc.",
        'dashboard.achievementsWidget': "Conquistas",
        'dashboard.viewAchievements': "Ver Medalhas",
        'dashboard.achievementsSub': "Desafios concluídos",
        'onboarding.dietTypeTitle': "Que tipo de dieta prefere?",
        'onboarding.dietTypeSub': "Selecione a abordagem nutricional que melhor lhe convém",
        'onboarding.dietTypeRecommendedTitle': "Recomendada",
        'onboarding.dietTypeRecommendedSub': "A melhor para si. Mistura ideal de proteínas, hidratos de carbono e gorduras",
        'onboarding.dietTypeHighProteinTitle': "Alta em Proteína",
        'onboarding.dietTypeHighProteinSub': "Mais proteína, menos hidratos de carbono e gorduras",
        'onboarding.dietTypeLowCarbTitle': "Baixo Carboidrato",
        'onboarding.dietTypeLowCarbSub': "Menos hidratos de carbono, mais gorduras e proteína moderada",
        'onboarding.dietTypeKetoTitle': "Ceto",
        'onboarding.dietTypeKetoSub': "Muito poucos hidratos de carbono, muita gordura e proteína moderada",
        'onboarding.dietTypeLowFatTitle': "Baixa em Gordura",
        'onboarding.dietTypeLowFatSub': "Menos gordura, mais hidratos de carbono e proteína moderada",
        'onboarding.personalizeTitle': "Personalize o seu objetivo",
        'onboarding.personalizeSub': "Último passo para saber as suas calorias e macros",
        'onboarding.currentWeight': "Peso atual",
        'onboarding.targetWeight': "Peso pretendido",
        'onboarding.velocity': "Velocidade",
        'onboarding.velocitySlow': "Conservador",
        'onboarding.velocityModerate': "Recomendado",
        'onboarding.velocityFast': "Agressivo",
        'onboarding.createPlan': "Criar o meu plano",
        'planner.noPlanYet': "Ainda não tem um plano",
        'planner.noWorkouts': "Nenhum treino planeado",
        'planner.restDay': "Dia de descanso",
        'planner.nutritionTab': "Nutrição",
        'planner.restDayHint': "Hoje é dia de descanso! Aproveite para recuperar.",
        'planner.workoutsTab': "Treinos"
    },
    'de': {
        'about.moreInfo': "Mehr Informationen",
        'profile.settings': "Einstellungen",
        'profile.updateGoals': "Ziele aktualisieren",
        'profile.mealPlanFoods': "Verfügbare Lebensmittel",
        'profile.reminders': "Erinnerungen",
        'profile.interface': "Oberfläche",
        'profile.syncMeals': "Mahlzeiten synchronisieren",
        'profile.account': "Konto",
        'profile.sendFeedback': "Feedback senden",
        'profile.updateSuccess': "Profil erfolgreich aktualisiert ✨",
        'profile.roleSuperAdmin': "Super Admin",
        'profile.roleAdmin': "Administrator",
        'profile.rolePro': "Pro Mitglied",
        'profile.loseWeightValidation': "Das Zielgewicht muss niedriger sein als das aktuelle Gewicht",
        'profile.gainWeightValidation': "Das Zielgewicht muss höher sein als das aktuelle Gewicht",
        'profile.maintainWeightInfo': "Dein Zielgewicht entspricht deinem aktuellen Gewicht",
        'profile.currentWeight': "Was ist dein aktuelles Gewicht?",
        'dashboard.seeHistory': "Verlauf anzeigen",
        'dashboard.measurementsSub': "Taille, Brust, etc.",
        'dashboard.achievementsWidget': "Erfolge",
        'dashboard.viewAchievements': "Medaillen ansehen",
        'dashboard.achievementsSub': "Abgeschlossene Herausforderungen",
        'onboarding.dietTypeTitle': "Welche Ernährungsform bevorzugst du?",
        'onboarding.dietTypeSub': "Wähle den Ernährungsansatz, der am besten zu dir passt",
        'onboarding.dietTypeRecommendedTitle': "Empfohlen",
        'onboarding.dietTypeRecommendedSub': "Das Beste für dich. Optimaler Mix aus Protein, Kohlenhydraten und Fetten",
        'onboarding.dietTypeHighProteinTitle': "Eiweißreich",
        'onboarding.dietTypeHighProteinSub': "Mehr Eiweiß, weniger Kohlenhydrate und Fette",
        'onboarding.dietTypeLowCarbTitle': "Low Carb",
        'onboarding.dietTypeLowCarbSub': "Weniger Kohlenhydrate, mehr Fette und moderat Eiweiß",
        'onboarding.dietTypeKetoTitle': "Keto",
        'onboarding.dietTypeKetoSub': "Sehr wenig Kohlenhydrate, viel Fett und moderat Eiweiß",
        'onboarding.dietTypeLowFatTitle': "Fettarm",
        'onboarding.dietTypeLowFatSub': "Weniger Fett, mehr Kohlenhydrate und moderat Eiweiß",
        'onboarding.personalizeTitle': "Personalisiere dein Ziel",
        'onboarding.personalizeSub': "Letzter Schritt, um deine Kalorien und Makros zu erfahren",
        'onboarding.currentWeight': "Aktuelles Gewicht",
        'onboarding.targetWeight': "Zielgewicht",
        'onboarding.velocity': "Geschwindigkeit",
        'onboarding.velocitySlow': "Konservativ",
        'onboarding.velocityModerate': "Empfohlen",
        'onboarding.velocityFast': "Aggressiv",
        'onboarding.createPlan': "Meinen Plan erstellen",
        'onboarding.foodItems.hot_sauce': "Scharfe Sauce",
        'planner.noPlanYet': "Du hast noch keinen Plan",
        'planner.noWorkouts': "Keine Workouts geplant",
        'planner.restDay': "Ruhetag",
        'planner.nutritionTab': "Ernährung",
        'planner.restDayHint': "Heute ist Ruhetag! Nutze die Zeit zur Erholung.",
        'planner.workoutsTab': "Workouts"
    },
    'ru': {
        'about.moreInfo': "Подробнее",
        'profile.settings': "Настройки",
        'profile.updateGoals': "Обновить цели",
        'profile.mealPlanFoods': "Доступные продукты",
        'profile.reminders': "Напоминания",
        'profile.interface': "Интерфейс",
        'profile.syncMeals': "Синхронизировать еду",
        'profile.account': "Аккаунт",
        'profile.sendFeedback': "Отправить отзыв",
        'profile.updateSuccess': "Профиль успешно обновлен ✨",
        'profile.roleSuperAdmin': "Супер Админ",
        'profile.roleAdmin': "Администратор",
        'profile.rolePro': "Pro участник",
        'profile.loseWeightValidation': "Целевой вес должен быть меньше текущего",
        'profile.gainWeightValidation': "Целевой вес должен быть больше текущего",
        'profile.maintainWeightInfo': "Ваш целевой вес совпадает с текущим",
        'profile.currentWeight': "Какой ваш текущий вес?",
        'dashboard.seeHistory': "История",
        'dashboard.measurementsSub': "Талия, грудь и т.д.",
        'dashboard.achievementsWidget': "Достижения",
        'dashboard.viewAchievements': "Посмотреть медали",
        'dashboard.achievementsSub': "Выполненные задачи",
        'onboarding.dietTypeTitle': "Какой тип диеты вы предпочитаете?",
        'onboarding.dietTypeSub': "Выберите подход к питанию, который вам подходит",
        'onboarding.dietTypeRecommendedTitle': "Рекомендуемый",
        'onboarding.dietTypeRecommendedSub': "Лучший выбор. Оптимальное сочетание белков, углеводов и жиров",
        'onboarding.dietTypeHighProteinTitle': "Высокобелковая",
        'onboarding.dietTypeHighProteinSub': "Больше белка, меньше углеводов и жиров",
        'onboarding.dietTypeLowCarbTitle': "Низкоуглеводная",
        'onboarding.dietTypeLowCarbSub': "Меньше углеводов, больше жиров и умеренно белков",
        'onboarding.dietTypeKetoTitle': "Кето",
        'onboarding.dietTypeKetoSub': "Очень мало углеводов, много жиров и умеренно белков",
        'onboarding.dietTypeLowFatTitle': "Низкожировая",
        'onboarding.dietTypeLowFatSub': "Меньше жиров, больше углеводов и умеренно белков",
        'onboarding.personalizeTitle': "Персонализируйте свою цель",
        'onboarding.personalizeSub': "Последний шаг, чтобы узнать ваши калории и макросы",
        'onboarding.currentWeight': "Текущий вес",
        'onboarding.targetWeight': "Целевой вес",
        'onboarding.velocity': "Скорость",
        'onboarding.velocitySlow': "Консервативная",
        'onboarding.velocityModerate': "Рекомендуемая",
        'onboarding.velocityFast': "Агрессивная",
        'onboarding.createPlan': "Создать мой план",
        'planner.noPlanYet': "У вас еще нет плана",
        'planner.noWorkouts': "Нет запланированных тренировок",
        'planner.nutritionTab': "Питание",
        'planner.restDayHint': "Сегодня день отдыха! Используйте это время для восстановления.",
        'planner.restDay': "День отдыха",
        'planner.workoutsTab': "Тренировки"
    }
}

def set_key(data, key, value):
    parts = key.split('.')
    d = data
    for p in parts[:-1]:
        if p not in d:
            d[p] = {}
        d = d[p]
    d[parts[-1]] = value

def get_keys_recursive(data, prefix=''):
    keys = []
    for k, v in data.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys.extend(get_keys_recursive(v, full_key))
        else:
            keys.append(full_key)
    return keys

en_keys = get_keys_recursive(en_data)

for lang, lang_trans in translations.items():
    lang_path = os.path.join(base_path, f'{lang}.json')
    if not os.path.exists(lang_path):
        continue
    
    with open(lang_path, 'r', encoding='utf-8') as f:
        lang_data = json.load(f)
    
    lang_keys = set(get_keys_recursive(lang_data))
    
    for key in en_keys:
        if key not in lang_keys:
            # Use translation if available, otherwise use English as fallback
            val = lang_trans.get(key)
            if val is None:
                # Special case: navigate English data to find value
                parts = key.split('.')
                val = en_data
                for p in parts:
                    val = val[p]
            
            set_key(lang_data, key, val)
    
    with open(lang_path, 'w', encoding='utf-8') as f:
        json.dump(lang_data, f, ensure_ascii=False, indent=2)
    
    print(f"Updated {lang}.json")
