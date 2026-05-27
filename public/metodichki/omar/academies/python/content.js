// Уникальные задания и викторины для каждой темы Python Academy
// 10 заданий + 10 вопросов на каждую из 40 тем, по нарастающей сложности

const TOPIC_CONTENT = {
1: { // Введение в Python
  tasks: [
    {q:"Выведи на экран фразу «Привет, Python!».", hint:"Используй print().", solution:`print("Привет, Python!")`},
    {q:"Выведи две строки подряд: «Меня зовут …» и «Мне … лет».", hint:"Два вызова print().", solution:`print("Меня зовут Аня")\nprint("Мне 12 лет")`},
    {q:"Добавь в программу комментарий, объясняющий что она делает.", hint:"Комментарий начинается с #.", solution:`# Программа печатает приветствие\nprint("Привет!")`},
    {q:"Выведи три любых смайлика в одной строке.", hint:"Передай несколько аргументов в print через запятую.", solution:`print("😀", "🐍", "🎉")`},
    {q:"Используй print() так, чтобы между словами стоял символ «-».", hint:"Параметр sep.", solution:`print("a","b","c", sep="-")`},
    {q:"Выведи 5 чисел в одной строке через пробел без переноса.", hint:"end=' '.", solution:`for i in range(1,6):\n    print(i, end=" ")`},
    {q:"Создай программу, которая печатает свою же первую строку как комментарий.", hint:"Просто продублируй текст в # и print.", solution:`# print('Hello')\nprint('Hello')`},
    {q:"Напиши скрипт, который выводит результат 2+2 и поясняет это словами.", hint:"print('2+2 =', 2+2).", solution:`print("2+2 =", 2+2)`},
    {q:"Используй \\n внутри одной строки, чтобы получить две строки вывода.", hint:"\\n = перевод строки.", solution:`print("первая\\nвторая")`},
    {q:"Напиши программу, которая выводит ASCII-арт ёлки из 3 строк.", hint:"Несколько print с пробелами и звёздочками.", solution:`print("  *")\nprint(" ***")\nprint("*****")`}
  ],
  quiz: [
    {q:"Какое расширение у файлов Python?", opts:[".py",".python",".pt",".p"], answer:0},
    {q:"Чем выполняется код Python?", opts:["Компилятором в .exe","Интерпретатором","Браузером","Сервером"], answer:1},
    {q:"Какая функция выводит текст в консоль?", opts:["echo()","print()","puts()","write()"], answer:1},
    {q:"С какого символа начинается однострочный комментарий?", opts:["//","#","--","/*"], answer:1},
    {q:"Как сделать перенос строки внутри строки?", opts:["\\n","\\t","<br>","\\r\\r"], answer:0},
    {q:"Что напечатает print('2'+'2')?", opts:["4","22","'22'","Ошибка"], answer:1},
    {q:"Какой параметр меняет разделитель в print?", opts:["sep","end","split","div"], answer:0},
    {q:"Какой параметр print отменяет перевод строки?", opts:["sep=''","end=''","nl=False","newline=0"], answer:1},
    {q:"Что выведет print('a','b')?", opts:["ab","a b","a,b","a\\nb"], answer:1},
    {q:"Какой Python считается «основным» сейчас?", opts:["Python 2","Python 3","Python 4","Python 1"], answer:1}
  ]
},
2: { // Переменные
  tasks: [
    {q:"Создай переменную age = 12 и выведи её.", hint:"print(age).", solution:`age = 12\nprint(age)`},
    {q:"Сохрани имя и возраст в двух переменных и выведи их в одной строке.", hint:"print(name, age).", solution:`name="Аня"; age=12\nprint(name, age)`},
    {q:"Поменяй значения двух переменных местами без третьей.", hint:"a, b = b, a.", solution:`a=1; b=2\na,b = b,a\nprint(a,b)`},
    {q:"Создай 3 переменные одной строкой.", hint:"x,y,z = 1,2,3.", solution:`x,y,z = 1,2,3\nprint(x,y,z)`},
    {q:"Заведи переменную is_student = True и выведи её тип.", hint:"type().", solution:`is_student = True\nprint(type(is_student))`},
    {q:"Возьми число, увеличь его на 5 через +=.", hint:"x += 5.", solution:`x = 10\nx += 5\nprint(x)`},
    {q:"Используй f-строку, чтобы вывести «Меня зовут Х и мне Y лет».", hint:"f\"... {x} ...\".", solution:`name="Аня"; age=12\nprint(f"Меня зовут {name} и мне {age} лет")`},
    {q:"Создай константу PI = 3.14 (UPPER_CASE) и используй её.", hint:"Имя в верхнем регистре.", solution:`PI = 3.14\nprint(2*PI*5)`},
    {q:"Объяви переменную и потом удали её через del. Проверь обращение в try/except.", hint:"del var.", solution:`x = 5\ndel x\ntry: print(x)\nexcept NameError: print("нет")`},
    {q:"Сделай переменную типа complex (например 2+3j) и выведи её модуль.", hint:"abs().", solution:`z = 2+3j\nprint(abs(z))`}
  ],
  quiz: [
    {q:"Как Python определяет тип переменной?", opts:["По объявлению","Автоматически","По расширению","Никак"], answer:1},
    {q:"Какое имя переменной валидно?", opts:["2name","my-name","_name","my name"], answer:2},
    {q:"Чем отличаются age и Age?", opts:["Ничем","Это разные переменные","Age константа","Age строка"], answer:1},
    {q:"Какой стиль рекомендуется в Python?", opts:["camelCase","snake_case","PascalCase","kebab-case"], answer:1},
    {q:"Что делает x += 1?", opts:["Сравнивает","Увеличивает на 1","Удаляет","Создаёт"], answer:1},
    {q:"Можно ли менять тип переменной?", opts:["Нет","Да","Только числа","Только строки"], answer:1},
    {q:"Что вернёт type(3.0)?", opts:["int","float","number","decimal"], answer:1},
    {q:"Как поменять a и b местами короче всего?", opts:["t=a;a=b;b=t","a,b=b,a","swap(a,b)","a=b=a"], answer:1},
    {q:"Что делает del x?", opts:["Обнуляет","Удаляет имя","Печатает","Сравнивает"], answer:1},
    {q:"Что напечатает print(f'{2+3}')?", opts:["2+3","5","{2+3}","Ошибка"], answer:1}
  ]
},
3: { // Типы данных
  tasks: [
    {q:"Создай переменные каждого основного типа: int, float, str, bool, None.", hint:"5 переменных.", solution:`a=1; b=1.5; c="x"; d=True; e=None\nprint(a,b,c,d,e)`},
    {q:"Преврати строку \"42\" в число и прибавь 8.", hint:"int().", solution:`print(int("42")+8)`},
    {q:"Преврати число 3.7 в int. Что произошло?", hint:"Дробная часть отбрасывается.", solution:`print(int(3.7))  # 3`},
    {q:"Проверь, что type(1.0) == float, и выведи True/False.", hint:"==.", solution:`print(type(1.0)==float)`},
    {q:"Преврати True в число.", hint:"int(True).", solution:`print(int(True))  # 1`},
    {q:"Возьми input() и определи, число ли это.", hint:"isdigit().", solution:`s = input()\nprint(s.isdigit())`},
    {q:"Преврати число 255 в строку из 3 символов.", hint:"str().", solution:`n=255\ns=str(n)\nprint(len(s), s)`},
    {q:"Используй isinstance, чтобы проверить, что x — int или float.", hint:"isinstance(x,(int,float)).", solution:`x=3.5\nprint(isinstance(x,(int,float)))`},
    {q:"Сделай функцию-классификатор: int→'число', str→'текст', list→'список'.", hint:"type().__name__.", solution:`def kind(v):\n    return {int:'число',str:'текст',list:'список'}.get(type(v),'другое')\nprint(kind([1,2]))`},
    {q:"Покажи, что None == False равно False, а bool(None) равен False.", hint:"Два print.", solution:`print(None==False)\nprint(bool(None))`}
  ],
  quiz: [
    {q:"Какой тип у 3.14?", opts:["int","float","str","decimal"], answer:1},
    {q:"Сколько значений у bool?", opts:["1","2","3","∞"], answer:1},
    {q:"Что вернёт int('5')?", opts:["'5'","5","5.0","Ошибка"], answer:1},
    {q:"Что вернёт float(2)?", opts:["2","2.0","'2'","2,0"], answer:1},
    {q:"Что вернёт type(None)?", opts:["bool","NoneType","null","void"], answer:1},
    {q:"Какой тип у [1,2,3]?", opts:["tuple","list","set","array"], answer:1},
    {q:"Что вернёт int(3.99)?", opts:["3","4","3.99","Ошибка"], answer:0},
    {q:"isinstance(x, int) проверяет...", opts:["Имя","Тип","Размер","Значение"], answer:1},
    {q:"Какое выражение даст True?", opts:["bool(0)","bool('')","bool('a')","bool(None)"], answer:2},
    {q:"Что вернёт str(123)?", opts:["123","'123'","[1,2,3]","Ошибка"], answer:1}
  ]
},
4: { // Строки (str)
  tasks: [
    {q:"Заведи строку и выведи её длину.", hint:"len().", solution:`s="Python"\nprint(len(s))`},
    {q:"Сделай строку ЗАГЛАВНЫМИ буквами.", hint:".upper().", solution:`print("привет".upper())`},
    {q:"Сделай первую букву каждого слова заглавной.", hint:".title().", solution:`print("hello world".title())`},
    {q:"Замени в строке все 'a' на '@'.", hint:".replace().", solution:`print("banana".replace("a","@"))`},
    {q:"Раздели строку \"a,b,c,d\" по запятой.", hint:".split(',').", solution:`print("a,b,c,d".split(","))`},
    {q:"Собери список ['Я','учу','Python'] в одну строку через пробел.", hint:"' '.join().", solution:`print(" ".join(['Я','учу','Python']))`},
    {q:"Проверь, начинается ли строка с 'http'.", hint:".startswith().", solution:`print("http://x".startswith("http"))`},
    {q:"Сделай палиндром-проверку строки.", hint:"s == s[::-1].", solution:`s="шалаш"\nprint(s==s[::-1])`},
    {q:"Подсчитай количество гласных в строке.", hint:"sum по in 'аеёиоуыэюя'.", solution:`s="привет"\nprint(sum(1 for c in s if c in "аеёиоуыэюя"))`},
    {q:"Используй f-строку с форматом числа до 2 знаков после запятой.", hint:"{x:.2f}.", solution:`x=3.14159\nprint(f"{x:.2f}")`}
  ],
  quiz: [
    {q:"Какой метод приводит к верхнему регистру?", opts:["upper()","big()","caps()","high()"], answer:0},
    {q:"Что вернёт len('abc')?", opts:["2","3","4","'3'"], answer:1},
    {q:"Что разделяет 'a-b-c'.split('-')?", opts:["['a-b-c']","['a','b','c']","'abc'","['a','b-c']"], answer:1},
    {q:"Чем удобны f-строки?", opts:["Скоростью","Подстановкой переменных","Сжатием","Шифрованием"], answer:1},
    {q:"Что вернёт 'abc'[::-1]?", opts:["'abc'","'cba'","'a'","Ошибка"], answer:1},
    {q:"Метод .replace('a','b') ...", opts:["Меняет в месте","Возвращает новую строку","Удаляет","Считает"], answer:1},
    {q:"Строки в Python ...", opts:["Изменяемы","Неизменяемы","Только в utf-8","Только в latin"], answer:1},
    {q:"Что вернёт ' hi '.strip()?", opts:["' hi'","'hi '","'hi'","' hi '"], answer:2},
    {q:"Что вернёт '-'.join(['a','b'])?", opts:["'a-b'","['a','-','b']","'ab'","Ошибка"], answer:0},
    {q:"Какая f-формат для 2 знаков после точки?", opts:["{:2f}","{:.2f}","{:f2}","{:0.2}"], answer:1}
  ]
},
5: { // Числа и математика
  tasks: [
    {q:"Сложи 7 и 8.", hint:"print(7+8).", solution:`print(7+8)`},
    {q:"Получи остаток от деления 25 на 4.", hint:"%.", solution:`print(25%4)`},
    {q:"Возведи 2 в степень 16.", hint:"**.", solution:`print(2**16)`},
    {q:"Сделай целочисленное деление 17 / 5.", hint:"//.", solution:`print(17//5)`},
    {q:"Используй math.sqrt чтобы найти корень из 144.", hint:"import math.", solution:`import math\nprint(math.sqrt(144))`},
    {q:"Округли 3.567 до 2 знаков.", hint:"round().", solution:`print(round(3.567,2))`},
    {q:"Найди модуль числа -42.", hint:"abs().", solution:`print(abs(-42))`},
    {q:"Найди наибольшее общее делитель 24 и 36.", hint:"math.gcd.", solution:`import math\nprint(math.gcd(24,36))`},
    {q:"Посчитай площадь круга радиусом 7 (math.pi).", hint:"π·r².", solution:`import math\nprint(math.pi*7**2)`},
    {q:"Реши квадратное уравнение x²-5x+6=0 по формуле.", hint:"D = b²-4ac.", solution:`import math\na,b,c=1,-5,6\nD=b*b-4*a*c\nprint((-b+math.sqrt(D))/(2*a),(-b-math.sqrt(D))/(2*a))`}
  ],
  quiz: [
    {q:"Что вернёт 7//2?", opts:["3.5","3","4","'3'"], answer:1},
    {q:"Что вернёт 7%2?", opts:["3","1","0","3.5"], answer:1},
    {q:"Что вернёт 2**3?", opts:["6","8","9","23"], answer:1},
    {q:"Что в модуле math?", opts:["Графика","Математические функции","Сеть","Файлы"], answer:1},
    {q:"Что вернёт 10/4?", opts:["2","2.5","'2.5'","Ошибка"], answer:1},
    {q:"Что вернёт abs(-5)?", opts:["-5","5","0","Ошибка"], answer:1},
    {q:"Какая функция округляет?", opts:["floor","round","ceil","int"], answer:1},
    {q:"Что вернёт math.pi (округлённо)?", opts:["3.14","2.71","1.61","9.81"], answer:0},
    {q:"Сколько даст 0.1+0.2?", opts:["0.3","≈0.30000000000000004","0.4","Ошибка"], answer:1},
    {q:"Какая операция = степень?", opts:["^","**","//","%"], answer:1}
  ]
},
6: { // Списки (list)
  tasks: [
    {q:"Создай список из 3 фруктов и выведи первый.", hint:"a[0].", solution:`f=["яблоко","груша","банан"]\nprint(f[0])`},
    {q:"Добавь элемент в конец списка.", hint:".append().", solution:`a=[1,2,3]\na.append(4)\nprint(a)`},
    {q:"Удали элемент по значению.", hint:".remove(val).", solution:`a=[1,2,3]\na.remove(2)\nprint(a)`},
    {q:"Найди длину списка и сумму его элементов.", hint:"len, sum.", solution:`a=[3,1,4,1,5]\nprint(len(a), sum(a))`},
    {q:"Отсортируй список по возрастанию.", hint:"sorted().", solution:`print(sorted([3,1,4,1,5]))`},
    {q:"Разверни список без среза.", hint:".reverse().", solution:`a=[1,2,3]\na.reverse()\nprint(a)`},
    {q:"Найди индекс элемента 'b' в списке.", hint:".index().", solution:`print(['a','b','c'].index('b'))`},
    {q:"Подсчитай, сколько раз 1 встречается в [1,2,1,3,1].", hint:".count().", solution:`print([1,2,1,3,1].count(1))`},
    {q:"Объедини два списка в один.", hint:"+ или extend.", solution:`a=[1,2]; b=[3,4]\nprint(a+b)`},
    {q:"Получи список квадратов чисел 1..10.", hint:"List comprehension.", solution:`print([x*x for x in range(1,11)])`}
  ],
  quiz: [
    {q:"С какого индекса начинается список?", opts:["0","1","-1","нет индекса"], answer:0},
    {q:"Какой метод добавляет в конец?", opts:["push","append","add","insert"], answer:1},
    {q:"Что вернёт len([1,2,3])?", opts:["2","3","6","'3'"], answer:1},
    {q:"Что вернёт [1,2,3][-1]?", opts:["1","3","2","Ошибка"], answer:1},
    {q:"Список — это...", opts:["Неизменяем","Изменяем","Только числа","Только строки"], answer:1},
    {q:"Что делает sorted(a)?", opts:["Сортирует в месте","Возвращает новый отсортированный","Удаляет","Только числа"], answer:1},
    {q:"a.remove(x) удаляет ...", opts:["Все x","Первый x","Последний x","По индексу"], answer:1},
    {q:"a+b где оба list...", opts:["Сложение чисел","Конкатенация","Ошибка","Пересечение"], answer:1},
    {q:"Что вернёт list(range(3))?", opts:["[1,2,3]","[0,1,2]","[0,1,2,3]","range(3)"], answer:1},
    {q:"a.insert(0,x) ...", opts:["Удаляет","Вставляет в начало","Сортирует","Заменяет"], answer:1}
  ]
},
7: { // Срезы
  tasks: [
    {q:"Возьми из [10,20,30,40,50] средние три элемента.", hint:"a[1:4].", solution:`print([10,20,30,40,50][1:4])`},
    {q:"Получи первые 3 символа строки 'Python'.", hint:"s[:3].", solution:`print("Python"[:3])`},
    {q:"Получи последние 2 символа строки.", hint:"s[-2:].", solution:`print("Python"[-2:])`},
    {q:"Разверни строку срезом.", hint:"[::-1].", solution:`print("hello"[::-1])`},
    {q:"Возьми каждый второй элемент списка 0..9.", hint:"[::2].", solution:`print(list(range(10))[::2])`},
    {q:"Удалите последний элемент списка через срез.", hint:"a[:-1].", solution:`a=[1,2,3,4]\nprint(a[:-1])`},
    {q:"Скопируй список через срез.", hint:"b = a[:].", solution:`a=[1,2,3]\nb=a[:]\nb.append(4)\nprint(a,b)`},
    {q:"Замени средние элементы списка через присваивание срезу.", hint:"a[1:3]=[…].", solution:`a=[1,2,3,4]\na[1:3]=[9,9]\nprint(a)`},
    {q:"Получи строку без первого и последнего символа.", hint:"s[1:-1].", solution:`print("(hi)"[1:-1])`},
    {q:"Раздели строку на 2 половины срезами.", hint:"len()//2.", solution:`s="Python"\nm=len(s)//2\nprint(s[:m], s[m:])`}
  ],
  quiz: [
    {q:"a[1:4] вернёт...", opts:["1..4","1..3","2..4","2..3"], answer:1},
    {q:"a[::-1] это...", opts:["Сортировка","Разворот","Копия","Ошибка"], answer:1},
    {q:"a[:] это...", opts:["Пустой список","Копия списка","Один элемент","Длина"], answer:1},
    {q:"a[::2] это...", opts:["Каждый второй","Первые 2","Последние 2","Степень 2"], answer:0},
    {q:"Где stop в a[i:j:k]?", opts:["i","j","k","i+1"], answer:1},
    {q:"Что вернёт 'abc'[1:]?", opts:["'a'","'bc'","'ab'","'abc'"], answer:1},
    {q:"Что вернёт 'abcdef'[-3:]?", opts:["'abc'","'def'","'cde'","'f'"], answer:1},
    {q:"Что вернёт [1,2,3][10:]?", opts:["Ошибка","[]","[1,2,3]","None"], answer:1},
    {q:"a[1:3]=[7,8,9] ...", opts:["Ошибка","Список длиннее","Список короче","Без изменений"], answer:1},
    {q:"len('python'[1:4])?", opts:["2","3","4","6"], answer:1}
  ]
},
8: { // Кортежи
  tasks: [
    {q:"Создай кортеж координат (3,4) и выведи x.", hint:"point[0].", solution:`p=(3,4)\nprint(p[0])`},
    {q:"Распакуй кортеж в две переменные.", hint:"x,y = p.", solution:`x,y=(3,4)\nprint(x,y)`},
    {q:"Создай кортеж из одного элемента.", hint:"(5,).", solution:`t=(5,)\nprint(type(t))`},
    {q:"Попробуй изменить элемент кортежа — поймай TypeError.", hint:"try/except.", solution:`try:\n    (1,2)[0]=3\nexcept TypeError as e: print(e)`},
    {q:"Преврати список [1,2,3] в кортеж.", hint:"tuple().", solution:`print(tuple([1,2,3]))`},
    {q:"Сравни два кортежа поэлементно: (1,2) < (1,3).", hint:"Просто print.", solution:`print((1,2)<(1,3))`},
    {q:"Верни из функции два значения через кортеж.", hint:"return a,b.", solution:`def f(x): return x, x*x\nprint(f(5))`},
    {q:"Подсчитай частоту элементов в кортеже через .count().", hint:".count(x).", solution:`t=(1,2,2,3,2)\nprint(t.count(2))`},
    {q:"Используй кортеж как ключ словаря.", hint:"d[(1,2)] = 'A'.", solution:`d={(1,2):"A",(3,4):"B"}\nprint(d[(1,2)])`},
    {q:"Сделай функцию swap через кортежную распаковку.", hint:"return b,a.", solution:`def swap(a,b): return b,a\nprint(swap(1,2))`}
  ],
  quiz: [
    {q:"Чем отличается tuple от list?", opts:["Скоростью","Неизменяемость","Типом","Размером"], answer:1},
    {q:"Какой синтаксис tuple из 1 элемента?", opts:["(5)","(5,)","[5]","{5}"], answer:1},
    {q:"Что вернёт type((1,2))?", opts:["list","tuple","set","pair"], answer:1},
    {q:"Можно ли использовать tuple как ключ dict?", opts:["Нет","Да","Только числа","Только строки"], answer:1},
    {q:"Что напечатает (1,2)+(3,4)?", opts:["(1,2,3,4)","(4,6)","Ошибка","[1,2,3,4]"], answer:0},
    {q:"a,b=(1,2) это...", opts:["Создание tuple","Распаковка","Ошибка","Сравнение"], answer:1},
    {q:"len((1,2,3))?", opts:["2","3","4","Ошибка"], answer:1},
    {q:"Можно ли изменить tuple?", opts:["Да","Нет","Только числа","Только последний"], answer:1},
    {q:"Что быстрее: tuple или list?", opts:["list","tuple","Одинаково","Зависит"], answer:1},
    {q:"Что вернёт (1,2,2,2).count(2)?", opts:["1","2","3","4"], answer:2}
  ]
},
9: { // Словари
  tasks: [
    {q:"Создай словарь {'name':'Аня','age':10} и выведи name.", hint:"d['name'].", solution:`d={"name":"Аня","age":10}\nprint(d["name"])`},
    {q:"Добавь новый ключ 'city' = 'Москва'.", hint:"d['city']='Москва'.", solution:`d={}\nd["city"]="Москва"\nprint(d)`},
    {q:"Проверь, есть ли ключ 'age' в словаре.", hint:"in.", solution:`d={"age":10}\nprint("age" in d)`},
    {q:"Используй .get для безопасного доступа.", hint:"d.get(k,default).", solution:`d={"a":1}\nprint(d.get("b","нет"))`},
    {q:"Пройди по словарю и выведи k=v.", hint:"items().", solution:`d={"a":1,"b":2}\nfor k,v in d.items(): print(k,v)`},
    {q:"Получи список всех ключей.", hint:"list(d.keys()).", solution:`print(list({"a":1,"b":2}.keys()))`},
    {q:"Удали элемент по ключу.", hint:"del / pop.", solution:`d={"a":1,"b":2}\ndel d["a"]\nprint(d)`},
    {q:"Подсчитай частоту букв в строке через dict.", hint:"d[c]=d.get(c,0)+1.", solution:`s="banana"; d={}\nfor c in s: d[c]=d.get(c,0)+1\nprint(d)`},
    {q:"Объедини два словаря через | (Python 3.9+).", hint:"a | b.", solution:`a={"x":1}; b={"y":2}\nprint(a|b)`},
    {q:"Сделай словарь {n:n*n} для n от 1 до 5 (comprehension).", hint:"{n:n*n for ...}.", solution:`print({n:n*n for n in range(1,6)})`}
  ],
  quiz: [
    {q:"Из чего состоит элемент dict?", opts:["Только значение","Ключ:значение","Два значения","Индекс"], answer:1},
    {q:"Какой метод безопасного доступа?", opts:["fetch","get","safe","find"], answer:1},
    {q:"Что вернёт d.keys()?", opts:["Значения","Ключи","Пары","Длину"], answer:1},
    {q:"Могут ли быть одинаковые ключи?", opts:["Да","Нет","Только числа","Только строки"], answer:1},
    {q:"Чем удалить ключ?", opts:["del","remove","unset","kill"], answer:0},
    {q:"Какой ключ нельзя?", opts:["int","str","list","tuple"], answer:2},
    {q:"d.items() возвращает...", opts:["Только ключи","Только значения","Пары (k,v)","Длину"], answer:2},
    {q:"Что вернёт {'a':1}.get('b')?", opts:["0","''","None","Ошибка"], answer:2},
    {q:"Как объединить два dict в 3.9+?", opts:["+","|","&","*"], answer:1},
    {q:"{x:x for x in range(3)} это...", opts:["set","list","dict","tuple"], answer:2}
  ]
},
10: { // Множества
  tasks: [
    {q:"Создай множество {1,2,2,3} и выведи.", hint:"Дубли удалятся.", solution:`print({1,2,2,3})`},
    {q:"Проверь, входит ли 5 в множество.", hint:"in.", solution:`print(5 in {1,2,3,5})`},
    {q:"Найди объединение двух множеств.", hint:"|.", solution:`print({1,2}|{2,3})`},
    {q:"Найди пересечение.", hint:"&.", solution:`print({1,2,3}&{2,3,4})`},
    {q:"Найди разность.", hint:"-.", solution:`print({1,2,3}-{2})`},
    {q:"Удали дубликаты из списка через set.", hint:"list(set(a)).", solution:`print(list(set([1,2,2,3,3,3])))`},
    {q:"Создай пустое множество.", hint:"set(), не {}.", solution:`s=set()\nprint(type(s))`},
    {q:"Добавь и удали элемент.", hint:".add() / .discard().", solution:`s={1,2}; s.add(3); s.discard(1)\nprint(s)`},
    {q:"Проверь подмножество: {1,2} <= {1,2,3}.", hint:"<=.", solution:`print({1,2}<={1,2,3})`},
    {q:"Симметрическая разность двух множеств.", hint:"^.", solution:`print({1,2,3}^{2,3,4})`}
  ],
  quiz: [
    {q:"Что хранит set?", opts:["Упорядоченные","Уникальные","С дубликатами","Только числа"], answer:1},
    {q:"Какой оператор объединения?", opts:["+","|","&","^"], answer:1},
    {q:"& это...", opts:["Объединение","Пересечение","Разность","Сумма"], answer:1},
    {q:"Как создать пустое множество?", opts:["{}","set()","[]","()"], answer:1},
    {q:"^ это...", opts:["Степень","Симм. разность","И","Или"], answer:1},
    {q:"set([1,2,2,3]) это...", opts:["{1,2,2,3}","{1,2,3}","[1,2,3]","Ошибка"], answer:1},
    {q:"Какой метод добавляет?", opts:["append","add","push","insert"], answer:1},
    {q:"Set элементы должны быть...", opts:["Изменяемы","Хешируемы","Чисел","Строк"], answer:1},
    {q:"x in s сложность O(?)", opts:["1","n","log n","n^2"], answer:0},
    {q:"<= для set проверяет...", opts:["Меньше","Подмножество","Длину","Сумму"], answer:1}
  ]
},
11: { // if/elif/else
  tasks: [
    {q:"Если число > 0 — выведи 'плюс'.", hint:"if x>0.", solution:`x=5\nif x>0: print("плюс")`},
    {q:"Если возраст >= 18 — 'взрослый', иначе 'нет'.", hint:"if/else.", solution:`a=14\nprint("взрослый" if a>=18 else "нет")`},
    {q:"Раздели возраст: <12, 12..17, >=18.", hint:"if/elif/else.", solution:`a=14\nif a<12: print("ребёнок")\nelif a<18: print("подросток")\nelse: print("взрослый")`},
    {q:"Проверь чётность числа.", hint:"%2==0.", solution:`n=7\nprint("чёт" if n%2==0 else "нечёт")`},
    {q:"Проверь, что число входит в [1..10].", hint:"1<=n<=10.", solution:`n=5\nprint(1<=n<=10)`},
    {q:"Калькулятор оценок: 90+=5,75+=4,60+=3,иначе 2.", hint:"4 ветви.", solution:`g=82\nprint(5 if g>=90 else 4 if g>=75 else 3 if g>=60 else 2)`},
    {q:"Проверь високосный год.", hint:"%4==0 и (%100!=0 или %400==0).", solution:`y=2024\nprint(y%4==0 and (y%100!=0 or y%400==0))`},
    {q:"Без if: вычисли максимум из двух чисел тернарником.", hint:"a if a>b else b.", solution:`a,b=3,7\nprint(a if a>b else b)`},
    {q:"Проверь, что строка пустая или None.", hint:"if not s.", solution:`s=""\nprint("пусто" if not s else "ок")`},
    {q:"FizzBuzz для n=15.", hint:"%3, %5.", solution:`for n in range(1,16):\n    print("FizzBuzz" if n%15==0 else "Fizz" if n%3==0 else "Buzz" if n%5==0 else n)`}
  ],
  quiz: [
    {q:"Чем выделяется блок if?", opts:["{}","Отступом","[]",";"], answer:1},
    {q:"Что после if перед :?", opts:["Условие","Действие","Имя","Тип"], answer:0},
    {q:"elif это...", opts:["иначе","иначе если","и","или"], answer:1},
    {q:"a if cond else b — это...", opts:["if-statement","Тернарник","Цикл","Функция"], answer:1},
    {q:"Что вернёт bool('')?", opts:["True","False","Ошибка","None"], answer:1},
    {q:"Что вернёт bool([])?", opts:["True","False","[]","Ошибка"], answer:1},
    {q:"and возвращает...", opts:["bool всегда","Один из операндов","Только True","Только False"], answer:1},
    {q:"or при True or False?", opts:["False","True","None","Ошибка"], answer:1},
    {q:"not True это...", opts:["True","False","None","1"], answer:1},
    {q:"Что напечатает if 0: print('a')?", opts:["a","ничего","Ошибка","0"], answer:1}
  ]
},
12: { // for
  tasks: [
    {q:"Выведи числа 0..4 через for.", hint:"range(5).", solution:`for i in range(5): print(i)`},
    {q:"Сложи числа 1..100.", hint:"range(1,101).", solution:`print(sum(range(1,101)))`},
    {q:"Пройди по списку и выведи каждый элемент.", hint:"for x in list.", solution:`for x in [10,20,30]: print(x)`},
    {q:"Используй enumerate, чтобы вывести индекс и значение.", hint:"enumerate().", solution:`for i,v in enumerate(["a","b","c"]): print(i,v)`},
    {q:"Перебери две коллекции одновременно через zip.", hint:"zip().", solution:`for a,b in zip([1,2,3],["a","b","c"]): print(a,b)`},
    {q:"Найди максимум в списке через for.", hint:"if x>mx.", solution:`a=[3,1,7,4]\nmx=a[0]\nfor x in a:\n    if x>mx: mx=x\nprint(mx)`},
    {q:"Выведи только чётные от 1 до 20.", hint:"if i%2==0.", solution:`for i in range(1,21):\n    if i%2==0: print(i)`},
    {q:"Используй break, чтобы остановиться на первом отрицательном.", hint:"break.", solution:`for x in [3,1,-2,4]:\n    if x<0: break\n    print(x)`},
    {q:"Используй continue, чтобы пропустить нули.", hint:"continue.", solution:`for x in [1,0,2,0,3]:\n    if x==0: continue\n    print(x)`},
    {q:"Используй else после for (выполнится, если не было break).", hint:"for/else.", solution:`for x in [1,2,3]:\n    if x==9: break\nelse:\n    print("не нашли")`}
  ],
  quiz: [
    {q:"Что делает range(5)?", opts:["1..5","0..4","0..5","[5]"], answer:1},
    {q:"for x in [1,2] выполнится...", opts:["1","2","3","0"], answer:1},
    {q:"break это...", opts:["Пропустить шаг","Выйти из цикла","Удалить","Сбросить"], answer:1},
    {q:"continue это...", opts:["Выйти","Пропустить шаг","Завершить","Перезапуск"], answer:1},
    {q:"enumerate возвращает...", opts:["Значения","(индекс, значение)","Только индексы","Длину"], answer:1},
    {q:"zip останавливается на ... коллекции.", opts:["Длиннейшей","Короткой","Первой","Случайной"], answer:1},
    {q:"for/else: else сработает если...", opts:["Был break","Не было break","Всегда","Никогда"], answer:1},
    {q:"range(2,8,2) даст...", opts:["2,4,6,8","2,4,6","0,2,4,6","2,8"], answer:1},
    {q:"sum(range(1,11)) =", opts:["45","55","50","100"], answer:1},
    {q:"Лучший способ перебрать индекс+значение?", opts:["range(len(a))","enumerate(a)","zip(a)","filter"], answer:1}
  ]
},
13: { // while
  tasks: [
    {q:"Считай от 5 до 1 с while.", hint:"n-=1.", solution:`n=5\nwhile n>0:\n    print(n); n-=1`},
    {q:"Сложи числа, пока сумма < 50.", hint:"+= i.", solution:`s=0; i=1\nwhile s<50: s+=i; i+=1\nprint(s)`},
    {q:"Запрашивай ввод, пока не введут 'q' (имитируй списком).", hint:"break.", solution:`inputs=["a","b","q","c"]\ni=0\nwhile True:\n    x=inputs[i]; i+=1\n    if x=="q": break\n    print(x)`},
    {q:"Найди первую степень 2, большую 1000.", hint:"x*=2.", solution:`x=1\nwhile x<=1000: x*=2\nprint(x)`},
    {q:"Найди НОД(48,36) алгоритмом Евклида.", hint:"while b: a,b=b,a%b.", solution:`a,b=48,36\nwhile b: a,b=b,a%b\nprint(a)`},
    {q:"Угадай число от 1 до 100 за минимум попыток (бинарно).", hint:"low/high.", solution:`secret=42; lo,hi=1,100\nwhile lo<=hi:\n    m=(lo+hi)//2\n    if m==secret: print("найдено", m); break\n    if m<secret: lo=m+1\n    else: hi=m-1`},
    {q:"Цикл с else: проверь, что число простое.", hint:"while/else.", solution:`n=11; i=2\nwhile i*i<=n:\n    if n%i==0: print("не простое"); break\n    i+=1\nelse: print("простое")`},
    {q:"Считай факториал n.", hint:"while n>1: r*=n.", solution:`n=6; r=1\nwhile n>1: r*=n; n-=1\nprint(r)`},
    {q:"Прокрути while, пока случайное число не == 1 (random.randint).", hint:"import random.", solution:`import random\nx=0\nwhile x!=1: x=random.randint(1,3)\nprint("выпало 1")`},
    {q:"Сделай счётчик секунд от 1 до 5 с time.sleep (если уместно — просто print).", hint:"time.sleep(1).", solution:`import time\nn=1\nwhile n<=5: print(n); n+=1; time.sleep(0.1)`}
  ],
  quiz: [
    {q:"Когда while останавливается?", opts:["Через N итераций","Условие False","break","Оба B,C"], answer:3},
    {q:"Что вызовет бесконечный цикл?", opts:["while False","Условие всегда True без break","range(0)","print"], answer:1},
    {q:"i+=1 это...", opts:["i = i*1","i = i+1","Удаление","Сравнение"], answer:1},
    {q:"while/else: else сработает если...", opts:["Был break","Не было break","Всегда","Только при ошибке"], answer:1},
    {q:"Что напечатает n=0; while n<3: print(n); n+=1?", opts:["0,1,2","1,2,3","0,1,2,3","0"], answer:0},
    {q:"break внутри while...", opts:["Перезапуск","Выход","Пропуск шага","Ничего"], answer:1},
    {q:"continue внутри while...", opts:["Выход","Возврат к условию","Удаление","Пропуск к концу программы"], answer:1},
    {q:"Что важно для НЕ бесконечного цикла?", opts:["Менять переменную условия","print","импорт","return"], answer:0},
    {q:"while 1: это...", opts:["Ошибка","Бесконечный цикл","Один раз","Ноль раз"], answer:1},
    {q:"Алгоритм Евклида подходит для...", opts:["Сортировки","НОД","Поиска","Сложения"], answer:1}
  ]
},
14: { // Вложенные циклы
  tasks: [
    {q:"Выведи таблицу умножения 3x3.", hint:"for i for j.", solution:`for i in range(1,4):\n    for j in range(1,4): print(i*j, end=" ")\n    print()`},
    {q:"Заполни список 5x5 нулями.", hint:"[[0]*5 for _ in range(5)].", solution:`m=[[0]*5 for _ in range(5)]\nprint(m)`},
    {q:"Сделай треугольник из звёзд высотой 5.", hint:"'*'*(i+1).", solution:`for i in range(5): print("*"*(i+1))`},
    {q:"Перебери все пары (i,j) для i,j в 1..3.", hint:"Двойной for.", solution:`for i in range(1,4):\n    for j in range(1,4): print((i,j), end=" ")`},
    {q:"Найди в матрице 3x3 максимум.", hint:"max(max(row)).", solution:`m=[[1,2,3],[4,9,6],[7,8,5]]\nprint(max(max(r) for r in m))`},
    {q:"Транспонируй матрицу 3x3.", hint:"zip(*m).", solution:`m=[[1,2,3],[4,5,6],[7,8,9]]\nprint([list(r) for r in zip(*m)])`},
    {q:"Найди все пары (a,b) с a+b == 5, a,b в 0..5.", hint:"if a+b==5.", solution:`for a in range(6):\n    for b in range(6):\n        if a+b==5: print(a,b)`},
    {q:"Выведи ромб из звёзд (5 строк).", hint:"Пробелы.", solution:`for i in range(5):\n    print(" "*(4-i)+"*"*(2*i+1))`},
    {q:"Найди простые числа до 30 через двойной цикл.", hint:"for n; for i.", solution:`for n in range(2,31):\n    is_p=True\n    for i in range(2,int(n**0.5)+1):\n        if n%i==0: is_p=False; break\n    if is_p: print(n, end=" ")`},
    {q:"Реши задачу 'sum two': найди пару с суммой 7 в [2,4,3,5,1].", hint:"Двойной цикл по индексам.", solution:`a=[2,4,3,5,1]\nfor i in range(len(a)):\n    for j in range(i+1,len(a)):\n        if a[i]+a[j]==7: print(a[i],a[j])`}
  ],
  quiz: [
    {q:"Сколько шагов выполнит for x in r3: for y in r3?", opts:["3","6","9","12"], answer:2},
    {q:"break внутри внутреннего цикла прерывает...", opts:["Оба","Только внутренний","Внешний","Всю программу"], answer:1},
    {q:"Как создать матрицу 3x3 нулей?", opts:["[0]*9","[[0]*3]*3","[[0]*3 for _ in range(3)]","matrix(3)"], answer:2},
    {q:"Чем плох [[0]*3]*3?", opts:["Медленно","Все строки — один список","Не работает","Только для чисел"], answer:1},
    {q:"zip(*m) делает...", opts:["Сортирует","Транспонирует","Удаляет","Суммирует"], answer:1},
    {q:"Что выведет print('*'*3)?", opts:["3","'***'","***","Ошибка"], answer:2},
    {q:"Сложность двойного цикла по n,n?", opts:["O(n)","O(n²)","O(log n)","O(1)"], answer:1},
    {q:"Где применяют вложенные циклы?", opts:["Матрицы","Графики","Сортировки","Все верно"], answer:3},
    {q:"continue во внутреннем цикле...", opts:["Прерывает оба","Только внутренний шаг","Внешний шаг","Программу"], answer:1},
    {q:"Сколько пар (i,j) при i,j∈range(4)?", opts:["8","12","16","4"], answer:2}
  ]
},
15: { // Функции
  tasks: [
    {q:"Напиши функцию hello() которая печатает 'Привет'.", hint:"def hello().", solution:`def hello(): print("Привет")\nhello()`},
    {q:"Функция add(a,b) возвращает сумму.", hint:"return.", solution:`def add(a,b): return a+b\nprint(add(2,3))`},
    {q:"Функция area(r) возвращает площадь круга.", hint:"3.14*r*r.", solution:`def area(r): return 3.14*r*r\nprint(area(5))`},
    {q:"Функция с параметром по умолчанию greet(name='гость').", hint:"def f(x=...).", solution:`def greet(name="гость"): print("Привет,", name)\ngreet(); greet("Аня")`},
    {q:"Функция, принимающая *args, возвращает сумму.", hint:"*args.", solution:`def s(*a): return sum(a)\nprint(s(1,2,3,4))`},
    {q:"Функция возвращает min и max через tuple.", hint:"return min,max.", solution:`def mm(a): return min(a),max(a)\nprint(mm([3,1,4,1,5]))`},
    {q:"Функция факториал рекурсивно.", hint:"if n<=1: return 1.", solution:`def f(n): return 1 if n<=1 else n*f(n-1)\nprint(f(6))`},
    {q:"Функция считает Фибоначчи.", hint:"Рекурсия или цикл.", solution:`def fib(n):\n    a,b=0,1\n    for _ in range(n): a,b=b,a+b\n    return a\nprint(fib(10))`},
    {q:"Функция с **kwargs выводит все пары.", hint:"**kwargs.", solution:`def show(**kw):\n    for k,v in kw.items(): print(k,v)\nshow(name="A", age=10)`},
    {q:"Аннотация типов: def add(a:int,b:int)->int: ...", hint:"Подсказки типов.", solution:`def add(a:int,b:int)->int: return a+b\nprint(add(2,3))`}
  ],
  quiz: [
    {q:"Чем объявляется функция?", opts:["function","def","func","let"], answer:1},
    {q:"Что возвращает функция без return?", opts:["0","''","None","Ошибка"], answer:2},
    {q:"def f(x=5) — x это...", opts:["Аргумент по умолчанию","Тип","Константа","Ошибка"], answer:0},
    {q:"*args принимает...", opts:["Один аргумент","Список","Кортеж аргументов","Словарь"], answer:2},
    {q:"**kwargs это...", opts:["Список","Словарь именованных","Tuple","None"], answer:1},
    {q:"return может вернуть...", opts:["Только число","Только строку","Любое значение","Ничего нельзя"], answer:2},
    {q:"Зачем функции?", opts:["Повторное использование","Скорость","Уменьшение памяти","Все верно"], answer:0},
    {q:"def f()->int: что это после ->?", opts:["По умолчанию","Аннотация типа","Возврат","Метка"], answer:1},
    {q:"Можно вернуть несколько значений?", opts:["Нет","Да, через tuple","Только 2","Только числа"], answer:1},
    {q:"Рекурсия — это...", opts:["Цикл","Функция вызывает себя","Метод класса","Сравнение"], answer:1}
  ]
},
16: { // Lambda
  tasks: [
    {q:"Создай лямбду sq = lambda x: x*x и вызови с 5.", hint:"sq(5).", solution:`sq = lambda x: x*x\nprint(sq(5))`},
    {q:"Лямбда суммы двух аргументов.", hint:"lambda a,b: a+b.", solution:`s=lambda a,b:a+b\nprint(s(3,4))`},
    {q:"Используй map с lambda для удвоения [1,2,3].", hint:"map.", solution:`print(list(map(lambda x:x*2,[1,2,3])))`},
    {q:"filter с lambda — оставь чётные.", hint:"x%2==0.", solution:`print(list(filter(lambda x:x%2==0,[1,2,3,4])))`},
    {q:"Сортируй список словарей по полю 'age'.", hint:"key=lambda d:d['age'].", solution:`a=[{"age":3},{"age":1}]\nprint(sorted(a, key=lambda d:d["age"]))`},
    {q:"max() с key=lambda — найди самое длинное слово.", hint:"key=len.", solution:`print(max(["py","python","p"], key=lambda s:len(s)))`},
    {q:"Лямбда возвращает True/False (чётность).", hint:"x%2==0.", solution:`even=lambda x:x%2==0\nprint(even(4))`},
    {q:"Сортируй пары (имя, возраст) по возрасту.", hint:"key=lambda t:t[1].", solution:`a=[("A",10),("B",5)]\nprint(sorted(a, key=lambda t:t[1]))`},
    {q:"reduce с lambda — произведение списка.", hint:"functools.reduce.", solution:`from functools import reduce\nprint(reduce(lambda a,b:a*b,[1,2,3,4]))`},
    {q:"Lambda внутри dict {name: lambda x: ...}.", hint:"Вызывай ops['sq'](5).", solution:`ops={"sq":lambda x:x*x,"cube":lambda x:x**3}\nprint(ops["cube"](3))`}
  ],
  quiz: [
    {q:"Lambda — это...", opts:["Класс","Анонимная функция","Модуль","Файл"], answer:1},
    {q:"Сколько выражений в lambda?", opts:["Несколько","Одно","Ноль","Любое"], answer:1},
    {q:"Что вернёт (lambda x: x+1)(2)?", opts:["2","3","'3'","Ошибка"], answer:1},
    {q:"Где используется lambda?", opts:["map","filter","sorted","Все верно"], answer:3},
    {q:"sorted(a, key=lambda x:-x) сортирует...", opts:["По возрастанию","По убыванию","Случайно","Не работает"], answer:1},
    {q:"reduce из ...", opts:["math","functools","itertools","sys"], answer:1},
    {q:"map возвращает...", opts:["list","iterator","tuple","dict"], answer:1},
    {q:"filter оставляет элементы где функция возвращает...", opts:["True","False","None","Любое"], answer:0},
    {q:"Lambda может принимать ... аргументов.", opts:["1","2","Любое","0"], answer:2},
    {q:"Чем заменяют lambda для длинных функций?", opts:["def","class","module","import"], answer:0}
  ]
},
17: { // Область видимости
  tasks: [
    {q:"Покажи, что переменная внутри функции локальная.", hint:"NameError снаружи.", solution:`def f(): x=1; print(x)\nf()\ntry: print(x)\nexcept NameError: print("нет")`},
    {q:"Используй global для изменения глобальной.", hint:"global x.", solution:`x=0\ndef inc():\n    global x; x+=1\ninc(); print(x)`},
    {q:"Покажи разницу между присваиванием и чтением глобальной.", hint:"Можно читать, нельзя присвоить без global.", solution:`x=5\ndef f(): print(x)\nf()`},
    {q:"Используй nonlocal во вложенной функции.", hint:"nonlocal.", solution:`def outer():\n    x=1\n    def inner():\n        nonlocal x; x+=1\n    inner(); print(x)\nouter()`},
    {q:"Покажи область видимости параметров функции.", hint:"Они локальные.", solution:`def f(a): print(a)\nf(5)`},
    {q:"Создай счётчик через замыкание.", hint:"nonlocal counter.", solution:`def make():\n    c=0\n    def inc():\n        nonlocal c; c+=1; return c\n    return inc\ncounter=make()\nprint(counter(),counter())`},
    {q:"Покажи, что list внутри можно изменять без global.", hint:"a.append.", solution:`a=[]\ndef add(x): a.append(x)\nadd(1); add(2); print(a)`},
    {q:"Используй globals() и locals().", hint:"Просто print.", solution:`x=10\ndef f(): y=1; print(list(locals()))\nf()`},
    {q:"Создай переменную скрытую от соседнего модуля (locals).", hint:"Внутри функции.", solution:`def secret(): _x=42; return _x\nprint(secret())`},
    {q:"Замыкание с параметром-фабрикой: maker(n) -> функция умножения на n.", hint:"return lambda x: x*n.", solution:`def maker(n): return lambda x: x*n\ntimes3=maker(3)\nprint(times3(10))`}
  ],
  quiz: [
    {q:"Что такое локальная переменная?", opts:["Только в файле","Только в функции","Только в классе","Глобальная"], answer:1},
    {q:"global нужен чтобы...", opts:["Прочитать глобальную","Изменить глобальную","Создать локальную","Удалить"], answer:1},
    {q:"nonlocal используется для...", opts:["Глобальной","Локальной","Переменной внешней функции","Класса"], answer:2},
    {q:"Что такое замыкание?", opts:["Класс","Функция помнящая внешнее состояние","Цикл","Модуль"], answer:1},
    {q:"Параметры функции — это...", opts:["Глобальные","Локальные","nonlocal","Константы"], answer:1},
    {q:"Можно ли читать глобальную без global?", opts:["Нет","Да","Только число","Только строку"], answer:1},
    {q:"locals() возвращает...", opts:["Список","Словарь локальных","Tuple","Set"], answer:1},
    {q:"globals() возвращает...", opts:["Словарь глобальных","Список","None","Ошибка"], answer:0},
    {q:"LEGB — порядок поиска имени:", opts:["Local→Enclosing→Global→Built-in","Любой","Built-in→Local","Global→Local"], answer:0},
    {q:"Изменение list внутри функции без global...", opts:["Создаёт локальный","Меняет глобальный","Ошибка","Запрещено"], answer:1}
  ]
},
18: { // Модули и импорт
  tasks: [
    {q:"Импортируй math и выведи pi.", hint:"math.pi.", solution:`import math\nprint(math.pi)`},
    {q:"Импортируй только sqrt из math.", hint:"from math import sqrt.", solution:`from math import sqrt\nprint(sqrt(9))`},
    {q:"Импортируй random и выведи случайное число 1..10.", hint:"randint.", solution:`import random\nprint(random.randint(1,10))`},
    {q:"Импортируй модуль под псевдонимом.", hint:"import x as y.", solution:`import math as m\nprint(m.sqrt(16))`},
    {q:"Создай свой модуль mymod (опиши, как это делается).", hint:"mymod.py, потом import mymod.", solution:`# mymod.py: def hi(): print('hi')\n# main: import mymod; mymod.hi()`},
    {q:"Используй from datetime import datetime.", hint:"datetime.now().", solution:`from datetime import datetime\nprint(datetime.now())`},
    {q:"Импортируй несколько имён за один from.", hint:"from m import a,b.", solution:`from math import pi, e\nprint(pi, e)`},
    {q:"Используй dir(math), чтобы увидеть атрибуты.", hint:"dir().", solution:`import math\nprint(dir(math)[:5])`},
    {q:"Используй __name__ == '__main__'.", hint:"Запуск как скрипт.", solution:`if __name__=="__main__": print("Запущено напрямую")`},
    {q:"Импортируй sys и выведи версию Python.", hint:"sys.version.", solution:`import sys\nprint(sys.version)`}
  ],
  quiz: [
    {q:"Как импортировать модуль?", opts:["use","import","include","require"], answer:1},
    {q:"from m import x импортирует...", opts:["Весь модуль","Только x","Ничего","Файл"], answer:1},
    {q:"import m as p создаёт...", opts:["Копию","Псевдоним","Класс","Файл"], answer:1},
    {q:"Файл модуля имеет расширение...", opts:[".mod",".py",".js",".module"], answer:1},
    {q:"dir(m) показывает...", opts:["Файлы","Атрибуты модуля","Строки","Ошибки"], answer:1},
    {q:"if __name__=='__main__' используется чтобы...", opts:["Запустить как скрипт","Создать класс","Импортировать","Удалить"], answer:0},
    {q:"Где искать сторонние модули?", opts:["pip","npm","gem","cargo"], answer:0},
    {q:"Что такое pip?", opts:["IDE","Менеджер пакетов","Сайт","Тип данных"], answer:1},
    {q:"sys.path содержит...", opts:["Пути поиска модулей","Файлы","URL","DB"], answer:0},
    {q:"from math import * это...", opts:["Хорошо","Антипаттерн","Запрещено","Только в IDE"], answer:1}
  ]
},
19: { // Классы
  tasks: [
    {q:"Создай класс Person с именем и приветствием.", hint:"__init__, метод.", solution:`class Person:\n    def __init__(self,n): self.n=n\n    def hi(self): print("Привет, я",self.n)\nPerson("Аня").hi()`},
    {q:"Класс Counter с методами inc() и value.", hint:"self.value.", solution:`class Counter:\n    def __init__(self): self.value=0\n    def inc(self): self.value+=1\nc=Counter(); c.inc(); c.inc(); print(c.value)`},
    {q:"Класс Rectangle с методом area().", hint:"w*h.", solution:`class Rect:\n    def __init__(self,w,h): self.w=w; self.h=h\n    def area(self): return self.w*self.h\nprint(Rect(3,4).area())`},
    {q:"Атрибут класса (общий для всех экземпляров).", hint:"Вне __init__.", solution:`class Dog:\n    species="canis"\nprint(Dog.species)`},
    {q:"Метод __str__ для красивого print.", hint:"def __str__(self).", solution:`class P:\n    def __init__(self,n): self.n=n\n    def __str__(self): return f"P({self.n})"\nprint(P("A"))`},
    {q:"Метод __eq__ для сравнения объектов.", hint:"def __eq__(self,o).", solution:`class V:\n    def __init__(self,x): self.x=x\n    def __eq__(self,o): return self.x==o.x\nprint(V(1)==V(1))`},
    {q:"Класс с приватным полем _balance и методом снятия.", hint:"_.", solution:`class Acc:\n    def __init__(self): self._b=100\n    def withdraw(self,x):\n        if x<=self._b: self._b-=x\nA=Acc(); A.withdraw(30); print(A._b)`},
    {q:"Классовый метод @classmethod.", hint:"cls.", solution:`class C:\n    n=0\n    @classmethod\n    def inc(cls): cls.n+=1\nC.inc(); C.inc(); print(C.n)`},
    {q:"Статический метод @staticmethod.", hint:"Без self/cls.", solution:`class M:\n    @staticmethod\n    def add(a,b): return a+b\nprint(M.add(2,3))`},
    {q:"Класс Vector с __add__ для +.", hint:"def __add__.", solution:`class V:\n    def __init__(self,x,y): self.x=x; self.y=y\n    def __add__(self,o): return V(self.x+o.x,self.y+o.y)\n    def __repr__(self): return f"V({self.x},{self.y})"\nprint(V(1,2)+V(3,4))`}
  ],
  quiz: [
    {q:"Чем объявляется класс?", opts:["def","class","object","new"], answer:1},
    {q:"Что такое self?", opts:["Класс","Экземпляр","Метод","Модуль"], answer:1},
    {q:"__init__ это...", opts:["Деструктор","Конструктор","Метод печати","Static"], answer:1},
    {q:"Как создать объект?", opts:["new Class()","Class()","init Class","Class.new()"], answer:1},
    {q:"Атрибут класса доступен через...", opts:["Только экземпляр","Класс и экземпляр","Только класс","Никак"], answer:1},
    {q:"__str__ нужен для...", opts:["print","Сравнения","Сложения","Длины"], answer:0},
    {q:"@staticmethod не принимает...", opts:["Аргументы","self/cls","return","docstring"], answer:1},
    {q:"@classmethod первый параметр...", opts:["self","cls","this","class"], answer:1},
    {q:"Подчёркивание _name значит...", opts:["Приватное по соглашению","Запрещено","Статическое","Глобальное"], answer:0},
    {q:"__add__ работает с оператором...", opts:["+","-","*","="], answer:0}
  ]
},
20: { // Наследование
  tasks: [
    {q:"Класс Animal с методом eat. Класс Cat наследует.", hint:"class Cat(Animal).", solution:`class Animal:\n    def eat(self): print("ем")\nclass Cat(Animal): pass\nCat().eat()`},
    {q:"Добавь в Cat метод meow.", hint:"Свой метод.", solution:`class Animal:\n    def eat(self): print("ем")\nclass Cat(Animal):\n    def meow(self): print("мяу")\nc=Cat(); c.eat(); c.meow()`},
    {q:"Перегрузи метод родителя.", hint:"Тем же именем.", solution:`class A:\n    def hi(self): print("A")\nclass B(A):\n    def hi(self): print("B")\nB().hi()`},
    {q:"Вызови метод родителя через super().", hint:"super().", solution:`class A:\n    def hi(self): print("A")\nclass B(A):\n    def hi(self): super().hi(); print("B")\nB().hi()`},
    {q:"super() в __init__ для передачи параметров.", hint:"super().__init__.", solution:`class A:\n    def __init__(self,n): self.n=n\nclass B(A):\n    def __init__(self,n,m): super().__init__(n); self.m=m\nprint(B("a","b").n)`},
    {q:"Множественное наследование (mixin).", hint:"class C(A,B).", solution:`class A:\n    def a(self): print("a")\nclass B:\n    def b(self): print("b")\nclass C(A,B): pass\nc=C(); c.a(); c.b()`},
    {q:"Проверь isinstance.", hint:"isinstance(obj, Cls).", solution:`class A: pass\nclass B(A): pass\nprint(isinstance(B(),A))`},
    {q:"issubclass для классов.", hint:"issubclass(B,A).", solution:`class A: pass\nclass B(A): pass\nprint(issubclass(B,A))`},
    {q:"MRO (порядок разрешения методов).", hint:"Cls.__mro__.", solution:`class A: pass\nclass B(A): pass\nprint(B.__mro__)`},
    {q:"Абстрактный класс через ABC.", hint:"from abc.", solution:`from abc import ABC, abstractmethod\nclass Shape(ABC):\n    @abstractmethod\n    def area(self): pass\nclass S(Shape):\n    def area(self): return 4\nprint(S().area())`}
  ],
  quiz: [
    {q:"Как наследовать класс?", opts:["class B:A","class B(A):","B extends A","B from A"], answer:1},
    {q:"Что вызывает super()?", opts:["Класс","Родителя","Дочерний","Себя"], answer:1},
    {q:"isinstance(x, C) проверяет...", opts:["Имя","Что x — экземпляр C","Размер","Тип C"], answer:1},
    {q:"Перегрузка метода — это...", opts:["Удаление","Замена в подклассе","Скрытие","Копия"], answer:1},
    {q:"Множественное наследование возможно?", opts:["Нет","Да","Только 2","Только в abstract"], answer:1},
    {q:"MRO означает...", opts:["Memory","Method Resolution Order","Module","Override"], answer:1},
    {q:"Абстрактный метод требует...", opts:["@abstractmethod","@override","@final","@static"], answer:0},
    {q:"object — это...", opts:["Тип","Корневой класс","Метод","Файл"], answer:1},
    {q:"issubclass проверяет...", opts:["Экземпляр","Подкласс","Метод","Атрибут"], answer:1},
    {q:"Можно ли вызвать метод родителя?", opts:["Нет","Да через super","Только private","Никак"], answer:1}
  ]
},
21: { // Инкапсуляция
  tasks: [
    {q:"Сделай поле _balance и метод deposit.", hint:"self._balance.", solution:`class A:\n    def __init__(self): self._balance=0\n    def deposit(self,x): self._balance+=x\na=A(); a.deposit(50); print(a._balance)`},
    {q:"Используй __secret и попробуй прочитать снаружи.", hint:"Name mangling.", solution:`class A:\n    def __init__(self): self.__secret=42\na=A()\nprint(a._A__secret)`},
    {q:"Сделай @property для read-only поля.", hint:"@property.", solution:`class A:\n    def __init__(self): self._x=10\n    @property\n    def x(self): return self._x\nprint(A().x)`},
    {q:"Сделай setter для свойства.", hint:"@x.setter.", solution:`class A:\n    def __init__(self): self._x=0\n    @property\n    def x(self): return self._x\n    @x.setter\n    def x(self,v):\n        if v>=0: self._x=v\na=A(); a.x=5; print(a.x)`},
    {q:"Сделай метод withdraw, защищающий от ухода в минус.", hint:"if amount<=balance.", solution:`class A:\n    def __init__(self): self.__b=100\n    def withdraw(self,x):\n        if x<=self.__b: self.__b-=x; return True\n        return False\na=A(); print(a.withdraw(200))`},
    {q:"Свойство только для чтения с валидацией.", hint:"Без setter.", solution:`class T:\n    def __init__(self,v): self._v=v\n    @property\n    def value(self): return self._v\nprint(T(7).value)`},
    {q:"Сделай deleter для свойства.", hint:"@x.deleter.", solution:`class A:\n    def __init__(self): self._x=1\n    @property\n    def x(self): return self._x\n    @x.deleter\n    def x(self): self._x=None\na=A(); del a.x; print(a._x)`},
    {q:"Защити от установки несуществующих атрибутов через __slots__.", hint:"__slots__.", solution:`class A:\n    __slots__=("x",)\na=A(); a.x=5\ntry: a.y=1\nexcept AttributeError: print("нельзя")`},
    {q:"Скрытое логирование через дескриптор-property.", hint:"setter печатает.", solution:`class A:\n    def __init__(self): self._x=0\n    @property\n    def x(self): return self._x\n    @x.setter\n    def x(self,v): print("set",v); self._x=v\nA().x=9`},
    {q:"Класс TemperatureC c property Celsius->Fahrenheit.", hint:"f = c*9/5+32.", solution:`class T:\n    def __init__(self,c): self.c=c\n    @property\n    def f(self): return self.c*9/5+32\nprint(T(25).f)`}
  ],
  quiz: [
    {q:"Что означает _x по соглашению?", opts:["Публичное","Приватное","Константа","Метод"], answer:1},
    {q:"__x вызывает...", opts:["Name mangling","Ошибку","Глобальное","Static"], answer:0},
    {q:"@property превращает метод в...", opts:["Вызов","Атрибут","Класс","Файл"], answer:1},
    {q:"Как добавить setter?", opts:["@setter","@x.setter","setter()","@property.setter"], answer:1},
    {q:"Инкапсуляция нужна чтобы...", opts:["Ускорить","Спрятать детали","Унаследовать","Импортировать"], answer:1},
    {q:"__slots__ ограничивает...", opts:["Скорость","Атрибуты","Память","И B и C"], answer:3},
    {q:"К приватному __x можно обратиться через?", opts:["_Class__x","Никак","x","__x"], answer:0},
    {q:"@x.deleter удаляет...", opts:["Класс","Атрибут через del","Объект","Метод"], answer:1},
    {q:"Зачем геттеры/сеттеры?", opts:["Валидация и контроль","Скорость","Импорт","Внешний вид"], answer:0},
    {q:"@property заменяет...", opts:["метод getX()","Конструктор","Class","Import"], answer:0}
  ]
},
22: { // Полиморфизм
  tasks: [
    {q:"Два класса с одинаковым методом speak.", hint:"Утиная типизация.", solution:`class Cat:\n    def speak(self): return "мяу"\nclass Dog:\n    def speak(self): return "гав"\nfor a in [Cat(),Dog()]: print(a.speak())`},
    {q:"Функция, работающая с любым объектом, у которого есть .area().", hint:"obj.area().", solution:`class C:\n    def area(self): return 3\nclass S:\n    def area(self): return 4\ndef show(o): print(o.area())\nshow(C()); show(S())`},
    {q:"Перегрузка __add__ для двух разных классов.", hint:"def __add__.", solution:`class A:\n    def __init__(self,x): self.x=x\n    def __add__(self,o): return A(self.x+o.x)\nprint((A(2)+A(3)).x)`},
    {q:"Метод __len__ для своего класса.", hint:"def __len__.", solution:`class L:\n    def __init__(self,a): self.a=a\n    def __len__(self): return len(self.a)\nprint(len(L([1,2,3])))`},
    {q:"Полиморфизм через наследование.", hint:"Перегрузка.", solution:`class A:\n    def f(self): return "A"\nclass B(A):\n    def f(self): return "B"\nfor x in [A(),B()]: print(x.f())`},
    {q:"Сделай функцию, складывающую int+int и str+str (стандартный +).", hint:"Просто +.", solution:`def add(a,b): return a+b\nprint(add(1,2), add("a","b"))`},
    {q:"Метод __iter__ — класс становится итерируемым.", hint:"yield.", solution:`class R:\n    def __init__(self,n): self.n=n\n    def __iter__(self):\n        for i in range(self.n): yield i\nprint(list(R(3)))`},
    {q:"Метод __call__ — объект можно вызывать как функцию.", hint:"def __call__.", solution:`class M:\n    def __init__(self,n): self.n=n\n    def __call__(self,x): return x*self.n\ndouble=M(2)\nprint(double(5))`},
    {q:"Полиморфизм списков и кортежей — обе работают в for.", hint:"Общий for.", solution:`for c in [[1,2],(3,4)]:\n    for x in c: print(x)`},
    {q:"Сделай свой класс, поддерживающий ==, < (через __lt__).", hint:"functools.total_ordering.", solution:`from functools import total_ordering\n@total_ordering\nclass V:\n    def __init__(self,x): self.x=x\n    def __eq__(self,o): return self.x==o.x\n    def __lt__(self,o): return self.x<o.x\nprint(V(1)<V(2))`}
  ],
  quiz: [
    {q:"Полиморфизм — это...", opts:["Один тип","Один интерфейс — разные реализации","Один файл","Один метод"], answer:1},
    {q:"Утиная типизация — это...", opts:["Проверка типа","Если крякает как утка","Замок","Утка"], answer:1},
    {q:"__add__ срабатывает на...", opts:["+","-","*","/"], answer:0},
    {q:"__len__ для...", opts:["len()","sum()","count()","sorted()"], answer:0},
    {q:"__iter__ делает класс...", opts:["Итерируемым","Сравнимым","Печатаемым","Static"], answer:0},
    {q:"__call__ позволяет...", opts:["Вызвать как функцию","Печатать","Сравнить","Удалить"], answer:0},
    {q:"Можно ли полиморфизм без наследования?", opts:["Нет","Да","Только классы","Только функции"], answer:1},
    {q:"Что вернёт 'a'+'b'?", opts:["ab","a+b","Ошибка","'ab'"], answer:0},
    {q:"@total_ordering из...", opts:["functools","itertools","math","os"], answer:0},
    {q:"isinstance уважает наследование?", opts:["Нет","Да","Только object","Только class"], answer:1}
  ]
},
23: { // Обработка ошибок
  tasks: [
    {q:"Поймай ValueError при int('abc').", hint:"try/except.", solution:`try: int("abc")\nexcept ValueError as e: print(e)`},
    {q:"Поймай ZeroDivisionError.", hint:"1/0.", solution:`try: 1/0\nexcept ZeroDivisionError: print("ноль")`},
    {q:"Поймай несколько типов исключений.", hint:"except (A,B).", solution:`try: int("x")\nexcept (ValueError, TypeError) as e: print(e)`},
    {q:"Используй finally.", hint:"finally:.", solution:`try: print(1/1)\nfinally: print("конец")`},
    {q:"Подними своё исключение.", hint:"raise.", solution:`def f(x):\n    if x<0: raise ValueError("отриц")\nf(-1)`},
    {q:"Поймай и перевыкини с raise.", hint:"raise.", solution:`try:\n    try: int("x")\n    except ValueError: print("лог"); raise\nexcept ValueError: print("ещё раз")`},
    {q:"Сделай своё исключение MyError.", hint:"class MyError(Exception).", solution:`class MyError(Exception): pass\ntry: raise MyError("oh")\nexcept MyError as e: print(e)`},
    {q:"else после try (если ошибки не было).", hint:"try/except/else.", solution:`try: x=1\nexcept: pass\nelse: print("ок")`},
    {q:"Цепочка raise from.", hint:"raise B('') from a.", solution:`try: int("x")\nexcept ValueError as e:\n    try: raise RuntimeError("wrap") from e\n    except RuntimeError as r: print(r.__cause__)`},
    {q:"Контекст-менеджер try-with-finally через with.", hint:"with open as f.", solution:`with open("/tmp/_t.txt","w") as f: f.write("x")\nprint("закрыто автоматически")`}
  ],
  quiz: [
    {q:"Какой блок ловит ошибку?", opts:["if","try","catch","check"], answer:1},
    {q:"Какое ключевое слово ловит ошибку?", opts:["catch","except","handle","rescue"], answer:1},
    {q:"finally выполняется...", opts:["Только при ошибке","Только без ошибок","Всегда","Никогда"], answer:2},
    {q:"raise это...", opts:["Поднять ошибку","Поймать","Удалить","Сравнить"], answer:0},
    {q:"int('abc') вызовет...", opts:["TypeError","ValueError","KeyError","NameError"], answer:1},
    {q:"1/0 это...", opts:["ZeroDivisionError","ValueError","ArithmeticError","Все верно"], answer:0},
    {q:"else в try срабатывает если...", opts:["Ошибки не было","Ошибка была","Всегда","Не было finally"], answer:0},
    {q:"Какой базовый класс исключений?", opts:["Error","Exception","BaseException","Все B и C"], answer:1},
    {q:"raise X from Y — это...", opts:["Замена","Цепочка причин","Удаление","Сравнение"], answer:1},
    {q:"with open() гарантирует...", opts:["Открытие","Закрытие файла","Чтение","Запись"], answer:1}
  ]
},
24: { // Файлы
  tasks: [
    {q:"Запиши строку в файл.", hint:"open('w').", solution:`with open("/tmp/_a.txt","w") as f: f.write("Привет")`},
    {q:"Прочитай весь файл.", hint:".read().", solution:`with open("/tmp/_a.txt") as f: print(f.read())`},
    {q:"Прочитай построчно через for.", hint:"for line in f.", solution:`with open("/tmp/_a.txt") as f:\n    for line in f: print(line.rstrip())`},
    {q:"Дозапиши строку в конец.", hint:"'a'.", solution:`with open("/tmp/_a.txt","a") as f: f.write("\\nеще")`},
    {q:"Прочитай все строки в список.", hint:".readlines().", solution:`with open("/tmp/_a.txt") as f: print(f.readlines())`},
    {q:"Запиши список строк.", hint:".writelines().", solution:`with open("/tmp/_a.txt","w") as f: f.writelines(["a\\n","b\\n"])`},
    {q:"Используй кодировку utf-8 явно.", hint:"encoding='utf-8'.", solution:`with open("/tmp/_a.txt","w",encoding="utf-8") as f: f.write("Привет")`},
    {q:"Проверь существование файла через os.path.", hint:"os.path.exists.", solution:`import os\nprint(os.path.exists("/tmp/_a.txt"))`},
    {q:"Подсчитай число строк.", hint:"sum(1 for _).", solution:`with open("/tmp/_a.txt") as f:\n    print(sum(1 for _ in f))`},
    {q:"Прочитай бинарный файл и выведи длину.", hint:"'rb'.", solution:`with open("/tmp/_a.txt","rb") as f: print(len(f.read()))`}
  ],
  quiz: [
    {q:"Какой режим — запись?", opts:["r","w","a","b"], answer:1},
    {q:"Какой режим — дозапись?", opts:["r","w","a","x"], answer:2},
    {q:"with open() это...", opts:["Хорошо — автозакрытие","Плохо","Только для текста","Не работает"], answer:0},
    {q:"f.read() возвращает...", opts:["List","Str","Bytes","None"], answer:1},
    {q:"f.readlines() возвращает...", opts:["Str","List строк","Tuple","Dict"], answer:1},
    {q:"'rb' это...", opts:["Текст","Бинарный","Чтение","Дозапись"], answer:1},
    {q:"encoding='utf-8' для...", opts:["Скорости","Кодировки","Размера","Сжатия"], answer:1},
    {q:"Что делает open(f,'w') если файл есть?", opts:["Создаёт","Ошибка","Перезаписывает","Дописывает"], answer:2},
    {q:"Что делает 'x'?", opts:["Только если нет файла","Очистка","Удаление","Чтение"], answer:0},
    {q:"os.path.exists возвращает...", opts:["str","bool","int","list"], answer:1}
  ]
},
25: { // JSON
  tasks: [
    {q:"Преврати словарь в строку JSON.", hint:"json.dumps.", solution:`import json\nprint(json.dumps({"a":1}))`},
    {q:"Преврати строку JSON в словарь.", hint:"json.loads.", solution:`import json\nprint(json.loads('{"a":1}'))`},
    {q:"Сохрани с ensure_ascii=False (кириллица).", hint:"ensure_ascii=False.", solution:`import json\nprint(json.dumps({"имя":"Аня"}, ensure_ascii=False))`},
    {q:"Запиши JSON в файл.", hint:"json.dump.", solution:`import json\nwith open("/tmp/_j.json","w") as f: json.dump({"a":1},f)`},
    {q:"Прочитай JSON из файла.", hint:"json.load.", solution:`import json\nwith open("/tmp/_j.json") as f: print(json.load(f))`},
    {q:"Форматируй JSON с отступами indent=2.", hint:"indent=2.", solution:`import json\nprint(json.dumps({"a":1,"b":2}, indent=2))`},
    {q:"Сериализуй вложенные данные.", hint:"dict внутри dict.", solution:`import json\nprint(json.dumps({"u":{"n":"A","age":10}}))`},
    {q:"Поймай JSONDecodeError при битом JSON.", hint:"try/except.", solution:`import json\ntry: json.loads("{bad}")\nexcept json.JSONDecodeError as e: print(e)`},
    {q:"Сортируй ключи sort_keys=True.", hint:"sort_keys.", solution:`import json\nprint(json.dumps({"b":1,"a":2}, sort_keys=True))`},
    {q:"Сделай round-trip: dict→str→dict и сравни.", hint:"==.", solution:`import json\nd={"a":1}\nprint(json.loads(json.dumps(d))==d)`}
  ],
  quiz: [
    {q:"JSON — это...", opts:["Только Python","Универсальный формат","Двоичный","XML"], answer:1},
    {q:"json.dumps делает...", opts:["dict→str","str→dict","Файл","Запрос"], answer:0},
    {q:"json.loads делает...", opts:["dict→str","str→dict","Список","Скачивает"], answer:1},
    {q:"ensure_ascii=False нужно для...", opts:["Скорости","Кириллицы","Размера","Сжатия"], answer:1},
    {q:"json.dump пишет в...", opts:["str","file","db","url"], answer:1},
    {q:"indent=2 даёт...", opts:["Меньше","Читабельный JSON","Ошибку","Скорость"], answer:1},
    {q:"JSON поддерживает функции?", opts:["Да","Нет","Иногда","Только built-in"], answer:1},
    {q:"Можно ли сохранить tuple?", opts:["Да","Будет list","Ошибка","Только в str"], answer:1},
    {q:"Битый JSON вызывает...", opts:["ValueError","JSONDecodeError","TypeError","KeyError"], answer:1},
    {q:"sort_keys сортирует...", opts:["Значения","Ключи","Длину","Случайно"], answer:1}
  ]
},
26: { // Случайные числа
  tasks: [
    {q:"Сгенерируй случайное число 1..6 (кубик).", hint:"randint.", solution:`import random\nprint(random.randint(1,6))`},
    {q:"Выбери случайный элемент из списка.", hint:"choice.", solution:`import random\nprint(random.choice(["a","b","c"]))`},
    {q:"Перемешай список.", hint:"shuffle.", solution:`import random\na=[1,2,3,4]; random.shuffle(a); print(a)`},
    {q:"Сгенерируй float 0..1.", hint:"random().", solution:`import random\nprint(random.random())`},
    {q:"Сгенерируй float 5..10.", hint:"uniform.", solution:`import random\nprint(random.uniform(5,10))`},
    {q:"Выбери 3 случайных уникальных элемента.", hint:"sample.", solution:`import random\nprint(random.sample(range(10),3))`},
    {q:"Установи seed для воспроизводимости.", hint:"seed(42).", solution:`import random\nrandom.seed(42); print(random.randint(1,100))`},
    {q:"Сделай 5 бросков монеты.", hint:"choice('ОР').", solution:`import random\nfor _ in range(5): print(random.choice(["О","Р"]))`},
    {q:"Сгенерируй случайный пароль из 8 символов.", hint:"sample/choices+string.", solution:`import random, string\nprint("".join(random.choices(string.ascii_letters+string.digits, k=8)))`},
    {q:"Симулируй 1000 бросков кубика и посчитай среднее.", hint:"sum/len.", solution:`import random\na=[random.randint(1,6) for _ in range(1000)]\nprint(sum(a)/len(a))`}
  ],
  quiz: [
    {q:"Какая функция — случайное целое?", opts:["random","randint","uniform","choice"], answer:1},
    {q:"random() возвращает float в...", opts:["[0,1)","[0,1]","(0,1]","(0,1)"], answer:0},
    {q:"choice работает с...", opts:["int","list","dict","str"], answer:1},
    {q:"sample(a,k) возвращает...", opts:["k уникальных","k случайных с повтором","Один","Длину"], answer:0},
    {q:"shuffle меняет...", opts:["Копию","Список в месте","Возвращает новый","Ничего"], answer:1},
    {q:"seed используется для...", opts:["Скорости","Повторимости","Безопасности","Размера"], answer:1},
    {q:"uniform(a,b) возвращает...", opts:["int","float","bool","str"], answer:1},
    {q:"choices vs choice?", opts:["Одинаково","choices возвращает k","choice возвращает k","Нет choices"], answer:1},
    {q:"Из какого модуля random?", opts:["random","math","sys","os"], answer:0},
    {q:"Что вернёт sample([1,2],5)?", opts:["[1,2,1,2,1]","Ошибка","[]","None"], answer:1}
  ]
},
27: { // Дата и время
  tasks: [
    {q:"Получи текущее время.", hint:"datetime.now().", solution:`from datetime import datetime\nprint(datetime.now())`},
    {q:"Получи только сегодняшнюю дату.", hint:"date.today().", solution:`from datetime import date\nprint(date.today())`},
    {q:"Прибавь 7 дней к сегодняшней дате.", hint:"timedelta.", solution:`from datetime import date, timedelta\nprint(date.today()+timedelta(days=7))`},
    {q:"Найди разницу между двумя датами в днях.", hint:"(d1-d2).days.", solution:`from datetime import date\nprint((date(2026,1,1)-date(2025,1,1)).days)`},
    {q:"Сформатируй дату как 'дд.мм.гггг'.", hint:"strftime.", solution:`from datetime import date\nprint(date.today().strftime("%d.%m.%Y"))`},
    {q:"Распарси строку '2025-05-20' в date.", hint:"strptime.", solution:`from datetime import datetime\nprint(datetime.strptime("2025-05-20","%Y-%m-%d").date())`},
    {q:"Узнай день недели.", hint:".weekday().", solution:`from datetime import date\nprint(date.today().weekday())`},
    {q:"Сколько секунд между двумя datetime?", hint:".total_seconds().", solution:`from datetime import datetime\nprint((datetime(2025,1,2)-datetime(2025,1,1)).total_seconds())`},
    {q:"Получи UTC время.", hint:"datetime.utcnow().", solution:`from datetime import datetime\nprint(datetime.utcnow())`},
    {q:"Засеки время выполнения через time.time().", hint:"time.time().", solution:`import time\nt=time.time()\nfor _ in range(100000): pass\nprint(time.time()-t)`}
  ],
  quiz: [
    {q:"Из какого модуля datetime?", opts:["time","datetime","date","calendar"], answer:1},
    {q:"datetime.now() возвращает...", opts:["date","datetime","time","str"], answer:1},
    {q:"timedelta это...", opts:["Разница","Дата","Время","Только дни"], answer:0},
    {q:"strftime делает...", opts:["str→date","date→str","date+date","date-date"], answer:1},
    {q:"strptime делает...", opts:["date→str","str→date","time","int"], answer:1},
    {q:"weekday() возвращает...", opts:["1..7","0..6","0..7","str"], answer:1},
    {q:"%Y это...", opts:["День","Месяц","Год 4 цифры","Час"], answer:2},
    {q:"%H это...", opts:["Часы 12","Часы 24","Минуты","Дни"], answer:1},
    {q:"time.time() возвращает...", opts:["str","timestamp float","int","date"], answer:1},
    {q:"date.today() это...", opts:["datetime","date","time","str"], answer:1}
  ]
},
28: { // List Comprehension
  tasks: [
    {q:"Создай список квадратов 1..10.", hint:"[x*x ...].", solution:`print([x*x for x in range(1,11)])`},
    {q:"Только чётные из 1..20.", hint:"if x%2==0.", solution:`print([x for x in range(1,21) if x%2==0])`},
    {q:"Длины слов списка.", hint:"len(w).", solution:`print([len(w) for w in ["py","python"]])`},
    {q:"Заглавные первые буквы.", hint:"w[0].upper().", solution:`print([w[0].upper() for w in ["aa","bb"]])`},
    {q:"Условное выражение: 'чёт' / 'нечёт'.", hint:"x if cond else y.", solution:`print(["чёт" if x%2==0 else "нечёт" for x in range(5)])`},
    {q:"Двумерный список пар (i,j).", hint:"Вложенный for.", solution:`print([(i,j) for i in range(2) for j in range(2)])`},
    {q:"Преврати dict d={'a':1,'b':2} в [(k,v)].", hint:"d.items().", solution:`d={"a":1,"b":2}\nprint([(k,v) for k,v in d.items()])`},
    {q:"Уникальные элементы через set comprehension.", hint:"{x for x in ...}.", solution:`print({x%3 for x in range(10)})`},
    {q:"Dict comprehension {n:n*n}.", hint:"{k:v for ...}.", solution:`print({n:n*n for n in range(1,6)})`},
    {q:"Транспонируй матрицу 3x3 comprehension'ом.", hint:"m[j][i].", solution:`m=[[1,2,3],[4,5,6],[7,8,9]]\nprint([[m[j][i] for j in range(3)] for i in range(3)])`}
  ],
  quiz: [
    {q:"Какой синтаксис?", opts:["[for x in a: x]","[x for x in a]","[x: x in a]","[x; for x; a]"], answer:1},
    {q:"Когда использовать?", opts:["Никогда","Просто и читаемо","Только числа","Только str"], answer:1},
    {q:"[x*2 for x in a if x>0] оставит...", opts:["Все","Положительные ×2","Отрицательные","Нули"], answer:1},
    {q:"{x for x in a} это...", opts:["dict","set","list","tuple"], answer:1},
    {q:"{k:v for k,v in d.items()} это...", opts:["set","dict","list","tuple"], answer:1},
    {q:"Можно ли вложить?", opts:["Нет","Да","Только 2","Только set"], answer:1},
    {q:"Что эквивалентно [x for x in r if x>0]?", opts:["filter(lambda x:x>0,r)","map","reduce","sorted"], answer:0},
    {q:"Generator expression использует...", opts:["[]","()","{}","<>"], answer:1},
    {q:"Comprehension быстрее обычного цикла?", opts:["Обычно да","Всегда нет","Одинаково","Только в C"], answer:0},
    {q:"a if cond else b — это...", opts:["if-stmt","Тернарник","Цикл","Lambda"], answer:1}
  ]
},
29: { // Map/Filter/Reduce
  tasks: [
    {q:"map: удвой каждый элемент [1,2,3].", hint:"map(lambda x:x*2,a).", solution:`print(list(map(lambda x:x*2,[1,2,3])))`},
    {q:"filter: оставь только положительные.", hint:"x>0.", solution:`print(list(filter(lambda x:x>0,[-1,2,-3,4])))`},
    {q:"reduce: произведение списка.", hint:"functools.reduce.", solution:`from functools import reduce\nprint(reduce(lambda a,b:a*b,[1,2,3,4]))`},
    {q:"map по двум коллекциям одновременно.", hint:"map(f,a,b).", solution:`print(list(map(lambda x,y:x+y,[1,2],[10,20])))`},
    {q:"Цепочка map+filter.", hint:".", solution:`a=[1,2,3,4,5]\nprint(list(map(lambda x:x*x, filter(lambda x:x%2==0,a))))`},
    {q:"reduce с начальным значением.", hint:"reduce(f,xs,init).", solution:`from functools import reduce\nprint(reduce(lambda a,b:a+b,[1,2,3],100))`},
    {q:"map для приведения типов str→int.", hint:"map(int,...).", solution:`print(list(map(int,["1","2","3"])))`},
    {q:"filter с обычной функцией.", hint:"def is_pos.", solution:`def pos(x): return x>0\nprint(list(filter(pos,[-1,2,-3])))`},
    {q:"reduce: найди максимум.", hint:"a if a>b else b.", solution:`from functools import reduce\nprint(reduce(lambda a,b:a if a>b else b,[3,1,7,4]))`},
    {q:"Сравни comprehension vs map читаемость.", hint:"Просто покажи оба.", solution:`a=[1,2,3]\nprint([x*x for x in a], list(map(lambda x:x*x,a)))`}
  ],
  quiz: [
    {q:"map возвращает...", opts:["list","iterator","tuple","dict"], answer:1},
    {q:"filter оставляет где функция вернула...", opts:["True","False","None","Любое"], answer:0},
    {q:"reduce из...", opts:["math","functools","itertools","os"], answer:1},
    {q:"Сколько аргументов у функции в reduce?", opts:["1","2","3","Любое"], answer:1},
    {q:"map(f,a,b) даёт...", opts:["f(a)","f(a,b)","Ошибку","Список a"], answer:1},
    {q:"Что чаще используют?", opts:["map","comprehension","filter","reduce"], answer:1},
    {q:"reduce без init требует...", opts:["Пустой список","Минимум 1 элемент","2 элемента","Ничего"], answer:1},
    {q:"list(map(...)) нужен потому что...", opts:["map ленивый","Ошибка","Иначе строка","Нет"], answer:0},
    {q:"filter принимает функцию которая возвращает...", opts:["bool","int","str","list"], answer:0},
    {q:"map(int, ['1','2']) даст...", opts:["[1,2]","['1','2']","Ошибку","None"], answer:0}
  ]
},
30: { // HTTP requests
  tasks: [
    {q:"GET-запрос к https://api.github.com и status_code.", hint:"requests.get.", solution:`import requests\nprint(requests.get("https://api.github.com").status_code)`},
    {q:"Получи JSON ответа.", hint:".json().", solution:`import requests\nprint(requests.get("https://api.github.com").json())`},
    {q:"GET с параметрами ?q=python.", hint:"params=.", solution:`import requests\nrequests.get("https://api.github.com/search/repositories", params={"q":"python"})`},
    {q:"POST с json.", hint:"json=.", solution:`import requests\nrequests.post("https://httpbin.org/post", json={"a":1})`},
    {q:"Заголовки в запросе.", hint:"headers=.", solution:`import requests\nrequests.get("https://httpbin.org/get", headers={"User-Agent":"py"})`},
    {q:"Таймаут запроса.", hint:"timeout=5.", solution:`import requests\nrequests.get("https://httpbin.org/delay/1", timeout=5)`},
    {q:"Скачай файл (сохрани в /tmp).", hint:"r.content.", solution:`import requests\nr=requests.get("https://httpbin.org/image/png")\nopen("/tmp/img.png","wb").write(r.content)`},
    {q:"Проверь raise_for_status.", hint:".raise_for_status().", solution:`import requests\nr=requests.get("https://httpbin.org/status/404")\ntry: r.raise_for_status()\nexcept requests.HTTPError as e: print(e)`},
    {q:"Передай auth basic.", hint:"auth=(u,p).", solution:`import requests\nrequests.get("https://httpbin.org/basic-auth/u/p", auth=("u","p"))`},
    {q:"Сессия для нескольких запросов.", hint:"requests.Session.", solution:`import requests\ns=requests.Session()\ns.get("https://httpbin.org/cookies/set/a/1")\nprint(s.get("https://httpbin.org/cookies").json())`}
  ],
  quiz: [
    {q:"Какой пакет?", opts:["urllib","requests","http","fetch"], answer:1},
    {q:"Какой метод для чтения?", opts:["GET","POST","PUT","DELETE"], answer:0},
    {q:"Что вернёт r.status_code?", opts:["str","int","bool","dict"], answer:1},
    {q:"Что значит 404?", opts:["OK","Ошибка сервера","Не найдено","Перенаправление"], answer:2},
    {q:"r.json() парсит...", opts:["HTML","JSON","XML","CSV"], answer:1},
    {q:"params= кодирует в...", opts:["URL","Body","Headers","Cookies"], answer:0},
    {q:"POST с json= ставит Content-Type:", opts:["text/html","application/json","x-www-form","plain"], answer:1},
    {q:"raise_for_status кидает...", opts:["TimeoutError","HTTPError","Любое","Ничего"], answer:1},
    {q:"Что значит 200?", opts:["Не найдено","ОК","Создано","Ошибка"], answer:1},
    {q:"timeout указывается в...", opts:["мс","сек","мин","час"], answer:1}
  ]
},
31: { // NumPy
  tasks: [
    {q:"Создай массив [1,2,3,4].", hint:"np.array.", solution:`import numpy as np\nprint(np.array([1,2,3,4]))`},
    {q:"Массив нулей 3x3.", hint:"np.zeros.", solution:`import numpy as np\nprint(np.zeros((3,3)))`},
    {q:"Массив 0..9 через arange.", hint:"np.arange.", solution:`import numpy as np\nprint(np.arange(10))`},
    {q:"Умножь массив на 3.", hint:"a*3.", solution:`import numpy as np\nprint(np.array([1,2,3])*3)`},
    {q:"Сумма, среднее, максимум массива.", hint:".sum/.mean/.max.", solution:`import numpy as np\na=np.array([1,2,3,4])\nprint(a.sum(),a.mean(),a.max())`},
    {q:"Изменить форму 1D в 2D 2x3.", hint:".reshape.", solution:`import numpy as np\nprint(np.arange(6).reshape(2,3))`},
    {q:"Скалярное произведение двух векторов.", hint:"np.dot.", solution:`import numpy as np\nprint(np.dot([1,2,3],[4,5,6]))`},
    {q:"Случайная матрица 3x3.", hint:"np.random.rand.", solution:`import numpy as np\nprint(np.random.rand(3,3))`},
    {q:"Маска: только элементы > 5.", hint:"a[a>5].", solution:`import numpy as np\na=np.arange(10); print(a[a>5])`},
    {q:"Транспонирование матрицы.", hint:".T.", solution:`import numpy as np\nprint(np.arange(6).reshape(2,3).T)`}
  ],
  quiz: [
    {q:"Главный тип в numpy?", opts:["list","ndarray","tuple","matrix"], answer:1},
    {q:"np.zeros создаёт...", opts:["Единицы","Нули","Случайные","Пустые"], answer:1},
    {q:"a*2 для ndarray...", opts:["Удваивает","Удлиняет","Ошибка","Ничего"], answer:0},
    {q:"reshape меняет...", opts:["Размер","Форму","Тип","Имя"], answer:1},
    {q:"dot вычисляет...", opts:["Сумму","Скалярное произведение","Среднее","Максимум"], answer:1},
    {q:"NumPy быстрее списков благодаря...", opts:["GIL","Векторизации","Кэшу","Threading"], answer:1},
    {q:"a.T делает...", opts:["Сортировку","Транспонирование","Тип","Копию"], answer:1},
    {q:"a[a>5] это...", opts:["Маска","Срез","Метод","Ошибка"], answer:0},
    {q:"np.arange аналог...", opts:["range","linspace","ones","zeros"], answer:0},
    {q:"Размерности массива:", opts:["shape","size","dim","ndim"], answer:0}
  ]
},
32: { // Pandas
  tasks: [
    {q:"Создай DataFrame из словаря.", hint:"pd.DataFrame.", solution:`import pandas as pd\nprint(pd.DataFrame({"n":[1,2],"m":[3,4]}))`},
    {q:"Загрузи CSV (предположим есть).", hint:"pd.read_csv.", solution:`import pandas as pd\n# pd.read_csv('file.csv')`},
    {q:"Выведи первые 3 строки.", hint:".head(3).", solution:`import pandas as pd\nprint(pd.DataFrame({"a":[1,2,3,4]}).head(3))`},
    {q:"Среднее по столбцу.", hint:"df['a'].mean().", solution:`import pandas as pd\nprint(pd.DataFrame({"a":[1,2,3,4]})["a"].mean())`},
    {q:"Фильтр строк по условию.", hint:"df[df.a>2].", solution:`import pandas as pd\ndf=pd.DataFrame({"a":[1,2,3,4]}); print(df[df.a>2])`},
    {q:"Группировка groupby.", hint:".groupby.", solution:`import pandas as pd\ndf=pd.DataFrame({"g":["a","b","a"],"v":[1,2,3]})\nprint(df.groupby("g").sum())`},
    {q:"Добавь новый столбец.", hint:"df['b']=...", solution:`import pandas as pd\ndf=pd.DataFrame({"a":[1,2]})\ndf["b"]=df["a"]*10\nprint(df)`},
    {q:"Сортировка по столбцу.", hint:".sort_values.", solution:`import pandas as pd\nprint(pd.DataFrame({"a":[3,1,2]}).sort_values("a"))`},
    {q:"Описательная статистика describe.", hint:".describe.", solution:`import pandas as pd\nprint(pd.DataFrame({"a":[1,2,3,4]}).describe())`},
    {q:"Сохрани в CSV.", hint:".to_csv.", solution:`import pandas as pd\npd.DataFrame({"a":[1,2]}).to_csv("/tmp/_p.csv", index=False)`}
  ],
  quiz: [
    {q:"Главная структура pandas?", opts:["Series","DataFrame","Array","List"], answer:1},
    {q:"Что делает .head()?", opts:["Удаляет","Первые N строк","Последние","Случайные"], answer:1},
    {q:"groupby для...", opts:["Сортировки","Группировки","Удаления","Печати"], answer:1},
    {q:"read_csv читает...", opts:["JSON","CSV","XML","SQL"], answer:1},
    {q:"df['x'] вернёт...", opts:["DataFrame","Series","str","None"], answer:1},
    {q:"describe() возвращает...", opts:["Файл","Статистику","Список","Ошибку"], answer:1},
    {q:"sort_values сортирует по...", opts:["Индексу","Колонкам","Строкам","Цвету"], answer:1},
    {q:"merge это...", opts:["Сортировка","Соединение","Удаление","Печать"], answer:1},
    {q:"to_csv сохраняет в...", opts:["JSON","CSV","XML","DB"], answer:1},
    {q:"Pandas построен на...", opts:["Vanilla","NumPy","SciPy","Matplotlib"], answer:1}
  ]
},
33: { // Matplotlib
  tasks: [
    {q:"Построй линейный график.", hint:"plt.plot.", solution:`import matplotlib.pyplot as plt\nplt.plot([1,2,3],[4,1,7]); plt.show()`},
    {q:"Добавь заголовок и подписи осей.", hint:"title/xlabel/ylabel.", solution:`import matplotlib.pyplot as plt\nplt.plot([1,2,3]); plt.title("T"); plt.xlabel("x"); plt.ylabel("y"); plt.show()`},
    {q:"Гистограмма.", hint:"plt.hist.", solution:`import matplotlib.pyplot as plt\nplt.hist([1,2,2,3,3,3]); plt.show()`},
    {q:"Столбчатая диаграмма.", hint:"plt.bar.", solution:`import matplotlib.pyplot as plt\nplt.bar(["a","b"],[3,5]); plt.show()`},
    {q:"Несколько линий на одном графике.", hint:"Два plot.", solution:`import matplotlib.pyplot as plt\nplt.plot([1,2,3]); plt.plot([3,2,1]); plt.show()`},
    {q:"Легенда.", hint:"label= + legend().", solution:`import matplotlib.pyplot as plt\nplt.plot([1,2],label="a"); plt.legend(); plt.show()`},
    {q:"Точечный график scatter.", hint:"plt.scatter.", solution:`import matplotlib.pyplot as plt\nplt.scatter([1,2,3],[3,1,4]); plt.show()`},
    {q:"Сохрани картинку в файл.", hint:"savefig.", solution:`import matplotlib.pyplot as plt\nplt.plot([1,2]); plt.savefig("/tmp/_p.png")`},
    {q:"Несколько subplots 1x2.", hint:"plt.subplots.", solution:`import matplotlib.pyplot as plt\nfig,ax=plt.subplots(1,2); ax[0].plot([1,2]); ax[1].bar(["a"],[3]); plt.show()`},
    {q:"Стиль и цвет линии.", hint:"plt.plot(...,'r--').", solution:`import matplotlib.pyplot as plt\nplt.plot([1,2,3],'r--'); plt.show()`}
  ],
  quiz: [
    {q:"Какой объект главный?", opts:["axes","figure","plot","draw"], answer:1},
    {q:"plt.show() делает...", opts:["Сохраняет","Открывает окно","Удаляет","Печатает"], answer:1},
    {q:"hist это...", opts:["Гистограмма","Линия","Точки","Бар"], answer:0},
    {q:"savefig сохраняет в...", opts:["JSON","Файл","DB","Память"], answer:1},
    {q:"subplots возвращает...", opts:["fig","fig,ax","ax","None"], answer:1},
    {q:"plt.scatter рисует...", opts:["Линию","Точки","Бары","Гистограмму"], answer:1},
    {q:"Подпись оси x:", opts:["xlabel","title","legend","label"], answer:0},
    {q:"Легенда требует...", opts:["legend()","auto","label","color"], answer:0},
    {q:"plt — это...", opts:["matplotlib.pyplot","numpy","pandas","seaborn"], answer:0},
    {q:"'r--' — это...", opts:["Линия","Цвет+стиль","Точки","Ошибка"], answer:1}
  ]
},
34: { // Стек
  tasks: [
    {q:"Реализуй стек на list (push/pop).", hint:"append/pop.", solution:`class S:\n    def __init__(self): self.a=[]\n    def push(self,x): self.a.append(x)\n    def pop(self): return self.a.pop()\ns=S(); s.push(1); s.push(2); print(s.pop())`},
    {q:"peek (вершина без удаления).", hint:"a[-1].", solution:`class S:\n    def __init__(self): self.a=[]\n    def push(self,x): self.a.append(x)\n    def peek(self): return self.a[-1]\ns=S(); s.push(7); print(s.peek())`},
    {q:"is_empty.", hint:"not self.a.", solution:`class S:\n    def __init__(self): self.a=[]\n    def empty(self): return not self.a\nprint(S().empty())`},
    {q:"size().", hint:"len.", solution:`class S:\n    def __init__(self): self.a=[]\n    def size(self): return len(self.a)\nprint(S().size())`},
    {q:"Проверь сбалансированность скобок ()[]{}.", hint:"Стек.", solution:`def ok(s):\n    pairs={")":"(","]":"[","}":"{"}; st=[]\n    for c in s:\n        if c in "([{": st.append(c)\n        elif c in pairs:\n            if not st or st.pop()!=pairs[c]: return False\n    return not st\nprint(ok("([])"))`},
    {q:"Разверни строку через стек.", hint:"push потом pop.", solution:`def rev(s):\n    st=list(s); out=""\n    while st: out+=st.pop()\n    return out\nprint(rev("python"))`},
    {q:"Преврати инфиксную строку 1+2 в постфикс? — упрощённый.", hint:"Алгоритм shunting-yard.", solution:`# Упрощённо: только числа и +,-\ndef toPostfix(t):\n    out, st = [], []\n    for x in t.split():\n        if x.isdigit(): out.append(x)\n        else:\n            while st: out.append(st.pop())\n            st.append(x)\n    while st: out.append(st.pop())\n    return out\nprint(toPostfix("1 + 2 + 3"))`},
    {q:"Стек минимумов (getMin за O(1)).", hint:"Параллельный стек.", solution:`class M:\n    def __init__(self): self.a=[]; self.m=[]\n    def push(self,x):\n        self.a.append(x); self.m.append(min(x, self.m[-1] if self.m else x))\n    def getMin(self): return self.m[-1]\nm=M(); m.push(3); m.push(1); m.push(2); print(m.getMin())`},
    {q:"Используй стек для проверки палиндромов.", hint:"Половину в стек.", solution:`def pal(s):\n    st=list(s[:len(s)//2])\n    rest=s[(len(s)+1)//2:]\n    return all(st.pop()==c for c in rest)\nprint(pal("шалаш"))`},
    {q:"Стек для отмены действий (undo).", hint:"history.append.", solution:`hist=[]\ndef do(x): hist.append(x); print("сделано",x)\ndef undo(): print("отмена",hist.pop())\ndo("A"); do("B"); undo()`}
  ],
  quiz: [
    {q:"Стек работает по принципу...", opts:["FIFO","LIFO","Случайно","Сортировка"], answer:1},
    {q:"Что используем на list?", opts:["append/pop","insert(0)/pop(0)","push","add"], answer:0},
    {q:"peek это...", opts:["Удаление","Чтение вершины","Размер","Очистка"], answer:1},
    {q:"Сложность push на list?", opts:["O(1)","O(n)","O(log n)","O(n²)"], answer:0},
    {q:"Что значит LIFO?", opts:["First In First Out","Last In First Out","List Or","Long Int"], answer:1},
    {q:"Стек используется для...", opts:["Undo","Скобок","Рекурсии","Все верно"], answer:3},
    {q:"Сколько вершин у стека?", opts:["1","2","0","N"], answer:0},
    {q:"is_empty проверяет...", opts:["Полный","Пустой","Размер","Тип"], answer:1},
    {q:"pop без элементов вызовет...", opts:["IndexError","ValueError","TypeError","KeyError"], answer:0},
    {q:"deque.append + pop работает как...", opts:["Очередь","Стек","Мап","Сет"], answer:1}
  ]
},
35: { // Очередь
  tasks: [
    {q:"Создай deque и добавь 3 элемента.", hint:"deque().", solution:`from collections import deque\nq=deque(); q.append(1); q.append(2); print(q)`},
    {q:"popleft.", hint:".popleft().", solution:`from collections import deque\nq=deque([1,2,3])\nprint(q.popleft())`},
    {q:"FIFO: имитация очереди задач.", hint:"append/popleft.", solution:`from collections import deque\ntasks=deque(["a","b","c"])\nwhile tasks: print("делаю",tasks.popleft())`},
    {q:"Двусторонняя: добавь слева.", hint:"appendleft.", solution:`from collections import deque\nq=deque([2]); q.appendleft(1); print(q)`},
    {q:"Очередь с лимитом maxlen.", hint:"deque(maxlen=3).", solution:`from collections import deque\nq=deque(maxlen=3); q.extend([1,2,3,4]); print(q)`},
    {q:"BFS по графу (фрагмент).", hint:"queue + visited.", solution:`from collections import deque\ngraph={1:[2,3],2:[4],3:[],4:[]}\nq=deque([1]); seen={1}\nwhile q:\n    n=q.popleft(); print(n)\n    for v in graph[n]:\n        if v not in seen: seen.add(v); q.append(v)`},
    {q:"rotate.", hint:".rotate.", solution:`from collections import deque\nq=deque([1,2,3,4]); q.rotate(1); print(q)`},
    {q:"extendleft.", hint:".extendleft.", solution:`from collections import deque\nq=deque([0]); q.extendleft([1,2,3]); print(q)`},
    {q:"Скользящее окно максимума.", hint:"deque.", solution:`from collections import deque\ndef maxw(a,k):\n    q=deque(); r=[]\n    for i,x in enumerate(a):\n        while q and a[q[-1]]<=x: q.pop()\n        q.append(i)\n        if q[0]<=i-k: q.popleft()\n        if i>=k-1: r.append(a[q[0]])\n    return r\nprint(maxw([1,3,2,5,4],3))`},
    {q:"Используй queue.Queue для thread-safe.", hint:"queue.Queue.", solution:`import queue\nq=queue.Queue(); q.put(1); q.put(2); print(q.get())`}
  ],
  quiz: [
    {q:"Очередь работает...", opts:["FIFO","LIFO","Случайно","Сортировка"], answer:0},
    {q:"deque из...", opts:["collections","queue","array","list"], answer:0},
    {q:"popleft из...", opts:["Конца","Начала","Середины","Случайно"], answer:1},
    {q:"appendleft добавляет в...", opts:["Конец","Начало","Случайно","Середину"], answer:1},
    {q:"Сложность popleft у deque?", opts:["O(1)","O(n)","O(log n)","O(n²)"], answer:0},
    {q:"Сложность list.pop(0)?", opts:["O(1)","O(n)","O(log n)","O(n²)"], answer:1},
    {q:"maxlen ограничивает...", opts:["Тип","Длину","Память","Скорость"], answer:1},
    {q:"BFS использует...", opts:["Стек","Очередь","Heap","Trie"], answer:1},
    {q:"queue.Queue нужен для...", opts:["Сортировки","Потоков","Сети","Файлов"], answer:1},
    {q:"rotate сдвигает элементы...", opts:["Удаляет","Циклически","Сортирует","Удваивает"], answer:1}
  ]
},
36: { // Связный список
  tasks: [
    {q:"Создай Node с значением.", hint:"class Node.", solution:`class Node:\n    def __init__(self,v): self.v=v; self.next=None\nprint(Node(5).v)`},
    {q:"Связь двух Node.", hint:"a.next=b.", solution:`class Node:\n    def __init__(self,v): self.v=v; self.next=None\na=Node(1); a.next=Node(2)\nprint(a.next.v)`},
    {q:"LinkedList с add в начало.", hint:"head.", solution:`class N:\n    def __init__(self,v): self.v=v; self.next=None\nclass L:\n    def __init__(self): self.head=None\n    def add(self,v):\n        n=N(v); n.next=self.head; self.head=n\nl=L(); l.add(1); l.add(2); print(l.head.v)`},
    {q:"Print all values.", hint:"while.", solution:`class N:\n    def __init__(self,v): self.v=v; self.next=None\nh=N(1); h.next=N(2); h.next.next=N(3)\nn=h\nwhile n: print(n.v); n=n.next`},
    {q:"Длина списка.", hint:"counter.", solution:`class N:\n    def __init__(self,v): self.v=v; self.next=None\nh=N(1); h.next=N(2)\nc=0; n=h\nwhile n: c+=1; n=n.next\nprint(c)`},
    {q:"Поиск значения.", hint:"while.", solution:`class N:\n    def __init__(self,v): self.v=v; self.next=None\nh=N(1); h.next=N(7); h.next.next=N(3)\nn=h\nwhile n and n.v!=7: n=n.next\nprint(n.v if n else "нет")`},
    {q:"Реверс списка.", hint:"prev/curr/next.", solution:`class N:\n    def __init__(self,v): self.v=v; self.next=None\ndef rev(h):\n    p=None\n    while h: nx=h.next; h.next=p; p=h; h=nx\n    return p\nh=N(1); h.next=N(2); h.next.next=N(3)\nr=rev(h)\nwhile r: print(r.v); r=r.next`},
    {q:"Удаление по значению.", hint:"prev.next=curr.next.", solution:`class N:\n    def __init__(self,v): self.v=v; self.next=None\nh=N(1); h.next=N(2); h.next.next=N(3)\np,c=None,h\nwhile c and c.v!=2: p,c=c,c.next\nif c: p.next=c.next\nn=h\nwhile n: print(n.v); n=n.next`},
    {q:"Цикл (детектор Floyd).", hint:"Заяц и черепаха.", solution:`class N:\n    def __init__(self,v): self.v=v; self.next=None\ndef has_cycle(h):\n    s=f=h\n    while f and f.next:\n        s=s.next; f=f.next.next\n        if s is f: return True\n    return False\nh=N(1); h.next=N(2); h.next.next=h\nprint(has_cycle(h))`},
    {q:"Слияние двух отсортированных.", hint:"Merge.", solution:`class N:\n    def __init__(self,v): self.v=v; self.next=None\ndef merge(a,b):\n    d=N(0); t=d\n    while a and b:\n        if a.v<b.v: t.next=a; a=a.next\n        else: t.next=b; b=b.next\n        t=t.next\n    t.next=a or b\n    return d.next\na=N(1); a.next=N(3)\nb=N(2); b.next=N(4)\nm=merge(a,b)\nwhile m: print(m.v); m=m.next`}
  ],
  quiz: [
    {q:"У связного списка элементы хранят...", opts:["Только значение","Значение и ссылку","Индекс","Тип"], answer:1},
    {q:"Доступ по индексу — O(?)", opts:["1","n","log n","n²"], answer:1},
    {q:"Вставка в начало — O(?)", opts:["1","n","log n","n²"], answer:0},
    {q:"head указывает на...", opts:["Конец","Начало","Случайно","Хвост"], answer:1},
    {q:"Что значит next=None?", opts:["Ошибка","Конец списка","Цикл","Старт"], answer:1},
    {q:"Двусвязный имеет ссылку на...", opts:["next","prev","Оба","Ничего"], answer:2},
    {q:"Реверс делается за O(?)", opts:["1","n","log n","n²"], answer:1},
    {q:"Floyd детектирует...", opts:["Конец","Цикл","Длину","Хвост"], answer:1},
    {q:"Где быстрее вставка в начало: list или linked?", opts:["list","linked","Одинаково","Зависит"], answer:1},
    {q:"linked list в Python обычно делают на...", opts:["array","классах","tuple","dict"], answer:1}
  ]
},
37: { // Дерево
  tasks: [
    {q:"Создай узел с детьми.", hint:"children=[].", solution:`class T:\n    def __init__(self,v): self.v=v; self.children=[]\nr=T("a"); r.children.append(T("b")); print(r.children[0].v)`},
    {q:"Добавь метод add(child).", hint:".", solution:`class T:\n    def __init__(self,v): self.v=v; self.children=[]\n    def add(self,c): self.children.append(c)\nr=T(1); r.add(T(2)); print(r.children[0].v)`},
    {q:"Глубина дерева (рекурсия).", hint:"max+1.", solution:`class T:\n    def __init__(self,v): self.v=v; self.children=[]\ndef depth(n): return 1+max((depth(c) for c in n.children), default=0)\nr=T(1); r.children=[T(2),T(3)]\nprint(depth(r))`},
    {q:"DFS обход.", hint:"Рекурсия.", solution:`class T:\n    def __init__(self,v): self.v=v; self.children=[]\ndef dfs(n):\n    print(n.v)\n    for c in n.children: dfs(c)\nr=T(1); r.children=[T(2),T(3)]; r.children[0].children=[T(4)]\ndfs(r)`},
    {q:"BFS обход через очередь.", hint:"deque.", solution:`from collections import deque\nclass T:\n    def __init__(self,v): self.v=v; self.children=[]\nr=T(1); r.children=[T(2),T(3)]\nq=deque([r])\nwhile q:\n    n=q.popleft(); print(n.v); q.extend(n.children)`},
    {q:"Подсчёт узлов.", hint:"1+sum.", solution:`class T:\n    def __init__(self,v): self.v=v; self.children=[]\ndef cnt(n): return 1+sum(cnt(c) for c in n.children)\nr=T(1); r.children=[T(2),T(3)]\nprint(cnt(r))`},
    {q:"Бинарное дерево с left/right.", hint:".", solution:`class B:\n    def __init__(self,v): self.v=v; self.l=None; self.r=None\nb=B(1); b.l=B(2); b.r=B(3); print(b.l.v,b.r.v)`},
    {q:"Сумма всех значений в бинарном дереве.", hint:"Рекурсия.", solution:`class B:\n    def __init__(self,v): self.v=v; self.l=None; self.r=None\ndef s(n): return 0 if n is None else n.v+s(n.l)+s(n.r)\nb=B(1); b.l=B(2); b.r=B(3)\nprint(s(b))`},
    {q:"Inorder обход BST.", hint:"l,root,r.", solution:`class B:\n    def __init__(self,v): self.v=v; self.l=None; self.r=None\ndef inorder(n):\n    if not n: return\n    inorder(n.l); print(n.v); inorder(n.r)\nb=B(2); b.l=B(1); b.r=B(3); inorder(b)`},
    {q:"Поиск пути от корня к листу со значением.", hint:"Стек путей.", solution:`class T:\n    def __init__(self,v,c=()): self.v=v; self.c=list(c)\ndef path(n,t,p=()):\n    p=p+(n.v,)\n    if n.v==t: return p\n    for ch in n.c:\n        r=path(ch,t,p)\n        if r: return r\nr=T(1,[T(2,[T(4)]),T(3)])\nprint(path(r,4))`}
  ],
  quiz: [
    {q:"Корень дерева — это...", opts:["Лист","Узел без родителя","Любой","Самый большой"], answer:1},
    {q:"Лист — это...", opts:["Без детей","Корень","Высота","Глубина"], answer:0},
    {q:"DFS использует...", opts:["Стек","Очередь","Heap","Set"], answer:0},
    {q:"BFS использует...", opts:["Стек","Очередь","Heap","Set"], answer:1},
    {q:"Бинарное дерево — максимум детей...", opts:["1","2","3","N"], answer:1},
    {q:"BST: слева значения...", opts:["Больше","Меньше","Равные","Случайные"], answer:1},
    {q:"Inorder обход BST даёт...", opts:["Случайно","Отсортировано","От листа","От корня"], answer:1},
    {q:"Глубина дерева — это...", opts:["Длина пути","Число узлов","Корень","Лист"], answer:0},
    {q:"Дерево применяется в...", opts:["DOM","Файловой системе","Играх","Все верно"], answer:3},
    {q:"AVL дерево это...", opts:["Самобалансирующееся BST","Список","Set","Hash"], answer:0}
  ]
},
38: { // Сортировки
  tasks: [
    {q:"sorted([3,1,2]).", hint:"sorted.", solution:`print(sorted([3,1,2]))`},
    {q:"list.sort() сортирует в месте.", hint:"a.sort().", solution:`a=[3,1,2]; a.sort(); print(a)`},
    {q:"sorted по убыванию.", hint:"reverse=True.", solution:`print(sorted([3,1,2], reverse=True))`},
    {q:"sorted с key=len.", hint:"key=.", solution:`print(sorted(["aa","b","ccc"], key=len))`},
    {q:"Bubble sort вручную.", hint:"Двойной цикл.", solution:`def bubble(a):\n    a=a[:]\n    for i in range(len(a)):\n        for j in range(len(a)-1-i):\n            if a[j]>a[j+1]: a[j],a[j+1]=a[j+1],a[j]\n    return a\nprint(bubble([3,1,4]))`},
    {q:"Selection sort.", hint:"min index.", solution:`def sel(a):\n    a=a[:]\n    for i in range(len(a)):\n        m=i\n        for j in range(i+1,len(a)):\n            if a[j]<a[m]: m=j\n        a[i],a[m]=a[m],a[i]\n    return a\nprint(sel([3,1,4]))`},
    {q:"Insertion sort.", hint:"Сдвиг.", solution:`def ins(a):\n    a=a[:]\n    for i in range(1,len(a)):\n        x=a[i]; j=i-1\n        while j>=0 and a[j]>x: a[j+1]=a[j]; j-=1\n        a[j+1]=x\n    return a\nprint(ins([3,1,4]))`},
    {q:"Quick sort.", hint:"Pivot.", solution:`def qs(a):\n    if len(a)<2: return a\n    p=a[0]\n    return qs([x for x in a[1:] if x<p]) + [p] + qs([x for x in a[1:] if x>=p])\nprint(qs([3,1,4,1,5,9,2,6]))`},
    {q:"Merge sort.", hint:"Делим пополам.", solution:`def ms(a):\n    if len(a)<2: return a\n    m=len(a)//2\n    l,r=ms(a[:m]),ms(a[m:])\n    out=[]; i=j=0\n    while i<len(l) and j<len(r):\n        if l[i]<=r[j]: out.append(l[i]); i+=1\n        else: out.append(r[j]); j+=1\n    return out+l[i:]+r[j:]\nprint(ms([3,1,4,1,5,9,2,6]))`},
    {q:"Подсчётная сортировка для чисел 0..9.", hint:"count[].", solution:`def cs(a):\n    c=[0]*10\n    for x in a: c[x]+=1\n    out=[]\n    for v,n in enumerate(c): out.extend([v]*n)\n    return out\nprint(cs([3,1,4,1,5,9,2,6,5,3,5]))`}
  ],
  quiz: [
    {q:"Сложность bubble?", opts:["O(n)","O(n²)","O(n log n)","O(log n)"], answer:1},
    {q:"Сложность quicksort в среднем?", opts:["O(n)","O(n²)","O(n log n)","O(log n)"], answer:2},
    {q:"Какой алгоритм под капотом sorted()?", opts:["Quick","Merge","Timsort","Bubble"], answer:2},
    {q:"sorted возвращает...", opts:["None","Новый список","Изменяет в месте","Tuple"], answer:1},
    {q:"reverse=True...", opts:["По убыванию","По возрастанию","Случайно","Ошибка"], answer:0},
    {q:"key= это...", opts:["Сравнение","Функция ключа","Ошибка","Параметр"], answer:1},
    {q:"Самая быстрая в среднем?", opts:["Bubble","Selection","Quicksort","Insertion"], answer:2},
    {q:"Merge sort O(?) памяти?", opts:["1","n","n²","log n"], answer:1},
    {q:"Подсчётная сортировка работает для...", opts:["Любых","Целых ограниченных","Строк","Float"], answer:1},
    {q:"Какая стабильная?", opts:["Quicksort","Bubble","Heap","Selection"], answer:1}
  ]
},
39: { // Бинарный поиск
  tasks: [
    {q:"Простой бинарный поиск.", hint:"l,r.", solution:`def bs(a,t):\n    l,r=0,len(a)-1\n    while l<=r:\n        m=(l+r)//2\n        if a[m]==t: return m\n        if a[m]<t: l=m+1\n        else: r=m-1\n    return -1\nprint(bs([1,3,5,7,9],7))`},
    {q:"Поиск через bisect.", hint:"bisect.bisect_left.", solution:`import bisect\nprint(bisect.bisect_left([1,3,5,7],5))`},
    {q:"Поиск первой позиции >= target.", hint:"bisect_left.", solution:`import bisect\nprint(bisect.bisect_left([1,2,4,4,5],4))`},
    {q:"Поиск рекурсией.", hint:"return bs(...,m+1,r).", solution:`def bs(a,t,l=0,r=None):\n    if r is None: r=len(a)-1\n    if l>r: return -1\n    m=(l+r)//2\n    if a[m]==t: return m\n    return bs(a,t,m+1,r) if a[m]<t else bs(a,t,l,m-1)\nprint(bs([1,2,3,4,5],3))`},
    {q:"Поиск квадратного корня (целый).", hint:"бин. поиск 0..n.", solution:`def isqrt(n):\n    l,r=0,n\n    while l<=r:\n        m=(l+r)//2\n        if m*m<=n<(m+1)*(m+1): return m\n        if m*m<n: l=m+1\n        else: r=m-1\nprint(isqrt(17))`},
    {q:"Поиск пика в массиве.", hint:"бин. поиск.", solution:`def peak(a):\n    l,r=0,len(a)-1\n    while l<r:\n        m=(l+r)//2\n        if a[m]<a[m+1]: l=m+1\n        else: r=m\n    return l\nprint(peak([1,3,7,5,2]))`},
    {q:"Поиск минимума в повёрнутом массиве.", hint:"Сравни с правым.", solution:`def rmin(a):\n    l,r=0,len(a)-1\n    while l<r:\n        m=(l+r)//2\n        if a[m]>a[r]: l=m+1\n        else: r=m\n    return a[l]\nprint(rmin([4,5,6,7,0,1,2]))`},
    {q:"Поиск дубликата (через сортировку+bs).", hint:".", solution:`a=sorted([1,3,4,2,2])\nfor i in range(1,len(a)):\n    if a[i]==a[i-1]: print(a[i]); break`},
    {q:"Левая и правая границы вхождения.", hint:"bisect_left/right.", solution:`import bisect\na=[1,2,2,2,3]\nprint(bisect.bisect_left(a,2), bisect.bisect_right(a,2))`},
    {q:"Бинарный поиск по ответу: минимальная скорость.", hint:"Шаблон bs по предикату.", solution:`def can(s,h,T): return sum((x+s-1)//s for x in h)<=T\nh=[3,6,7,11]; T=8\nl,r=1,max(h)\nwhile l<r:\n    m=(l+r)//2\n    if can(m,h,T): r=m\n    else: l=m+1\nprint(l)`}
  ],
  quiz: [
    {q:"Бинарный поиск работает по...", opts:["Любому","Отсортированному","Случайному","Хешу"], answer:1},
    {q:"Сложность?", opts:["O(n)","O(log n)","O(n²)","O(1)"], answer:1},
    {q:"m=(l+r)//2 это...", opts:["Среднее","Сумма","Левый","Правый"], answer:0},
    {q:"bisect_left возвращает...", opts:["Индекс","Значение","Длину","None"], answer:0},
    {q:"Что если не найдено?", opts:["-1 или len","Ошибка","0","None"], answer:0},
    {q:"Сложность линейного поиска?", opts:["O(n)","O(log n)","O(n²)","O(1)"], answer:0},
    {q:"bisect из...", opts:["bisect","math","heapq","random"], answer:0},
    {q:"Что быстрее для отсортированных?", opts:["Линейный","Бинарный","Перебор","Сортировка"], answer:1},
    {q:"Если l>r — поиск...", opts:["Продолжается","Закончен","Ошибка","Перезапуск"], answer:1},
    {q:"Можно ли бин. поиск без массива?", opts:["Да, по предикату","Нет","Только set","Только dict"], answer:0}
  ]
},
40: { // Мини-проекты
  tasks: [
    {q:"Калькулятор: + - * / двух чисел.", hint:"input + if.", solution:`a=float(input()); op=input(); b=float(input())\nprint({"+":a+b,"-":a-b,"*":a*b,"/":a/b}.get(op))`},
    {q:"Игра «угадай число» 1..100.", hint:"random+while.", solution:`import random\ns=random.randint(1,100)\nwhile True:\n    g=int(input())\n    if g==s: print("Да!"); break\n    print("Больше" if g<s else "Меньше")`},
    {q:"To-Do list в памяти (add/list/done).", hint:"list.", solution:`todo=[]\ntodo.append({"t":"учить Python","done":False})\nprint(todo)`},
    {q:"Камень-ножницы-бумага.", hint:"random.choice.", solution:`import random\nopt=["к","н","б"]; pc=random.choice(opt)\np=input()\nprint("ничья" if p==pc else f"{p} vs {pc}")`},
    {q:"Простой парсер CSV.", hint:".split.", solution:`s="name,age\\nAnya,12"\nlines=s.split("\\n"); h=lines[0].split(",")\nfor l in lines[1:]:\n    print(dict(zip(h,l.split(","))))`},
    {q:"Telegram-бот заготовка (псевдокод).", hint:"requests + token.", solution:`# import requests\n# url=f"https://api.telegram.org/bot{TOKEN}/getMe"\n# print(requests.get(url).json())\nprint("заготовка")`},
    {q:"Хеш пароля (хеш SHA-256).", hint:"hashlib.", solution:`import hashlib\nprint(hashlib.sha256("123".encode()).hexdigest())`},
    {q:"Сохраняй прогресс игры в JSON.", hint:"json.dump.", solution:`import json\ndata={"level":3,"hp":99}\njson.dump(data, open("/tmp/_g.json","w"))\nprint(json.load(open("/tmp/_g.json")))`},
    {q:"Простой веб-скрапер заголовка страницы (requests+regex).", hint:"<title>...</title>.", solution:`import requests, re\nhtml=requests.get("https://example.com").text\nm=re.search(r"<title>(.*?)</title>",html)\nprint(m.group(1) if m else None)`},
    {q:"Финальный проект: викторина из 3 вопросов с подсчётом очков.", hint:"list of dict.", solution:`Q=[{"q":"2+2?","a":"4"},{"q":"py?","a":"python"}]\nscore=0\nfor x in Q:\n    if input(x["q"]+" ").strip()==x["a"]: score+=1\nprint("Очки:",score)`}
  ],
  quiz: [
    {q:"С чего начать проект?", opts:["Код","План","Тесты","Документация"], answer:1},
    {q:"input() возвращает...", opts:["int","str","bool","float"], answer:1},
    {q:"random.choice для...", opts:["Числа","Списка","DB","Файла"], answer:1},
    {q:"Где хранить настройки?", opts:["В коде","JSON/YAML","В памяти","В БД"], answer:1},
    {q:"requests нужен для...", opts:["БД","HTTP","Файлов","ОС"], answer:1},
    {q:"sha256 это...", opts:["Шифр","Хеш","Сжатие","Кодировка"], answer:1},
    {q:"Telegram-бот общается через...", opts:["FTP","HTTP API","SMTP","SSH"], answer:1},
    {q:"Логирование лучше через...", opts:["print","logging","comment","tracer"], answer:1},
    {q:"Где публиковать?", opts:["GitHub","Telegram","Email","Word"], answer:0},
    {q:"Главное в pet-project?", opts:["Сложность","Завершённость","Размер","Скорость"], answer:1}
  ]
}
};
