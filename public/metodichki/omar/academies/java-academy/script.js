// Java Academy — образовательная платформа по Java

const TOPICS = [
  {id:1, emoji:"🚀", title:"Введение в Java", level:"easy", group:"Основы",
    intro:"Java — мощный объектно-ориентированный язык программирования. Программы пишутся в .java файлах, компилируются javac в .class (байт-код) и выполняются JVM (виртуальной машиной Java). Принцип: «Write Once, Run Anywhere» — один и тот же код работает на Windows, Linux и macOS.",
    syntax:`public class Main {\n  public static void main(String[] args) {\n    System.out.println("Привет, мир!");\n  }\n}`,
    syntaxNote:"main — точка входа в любую Java-программу. System.out.println печатает текст и переводит строку."},
  {id:2, emoji:"🧰", title:"JDK, JRE, JVM", level:"easy", group:"Основы",
    intro:"JDK — комплект разработчика (компилятор javac, инструменты). JRE — среда выполнения (JVM + библиотеки). JVM — виртуальная машина, исполняющая байт-код. Для разработки нужен JDK.",
    syntax:`// Компиляция и запуск в терминале:\n// javac Main.java   ← создаёт Main.class\n// java Main         ← запускает программу\n// java -version     ← версия JVM`,
    syntaxNote:"Класс должен называться так же, как файл (с заглавной буквы)."},
  {id:3, emoji:"📦", title:"Переменные и примитивы", level:"easy", group:"Основы",
    intro:"Java строго типизирован: тип переменной указывается явно. Примитивы: int, long, short, byte, float, double, char, boolean.",
    syntax:`int age = 12;\ndouble price = 9.99;\nchar letter = 'A';\nboolean isOn = true;\nlong big = 100_000_000L;\nfinal int MAX = 100; // константа`,
    syntaxNote:"final делает переменную неизменяемой (как const в JS)."},
  {id:4, emoji:"✍️", title:"Строки (String)", level:"easy", group:"Основы",
    intro:"String — это объект, представляющий текст. Строки неизменяемы (immutable): любая операция возвращает новую строку.",
    syntax:`String s = "Привет";\nint len = s.length();          // 6\nString up = s.toUpperCase();   // "ПРИВЕТ"\nString greet = "Привет, " + "Аня";\nboolean eq = s.equals("Привет"); // сравнение`,
    syntaxNote:"Сравнивай строки через .equals(), а не == ! == сравнивает ссылки."},
  {id:5, emoji:"➕", title:"Операторы и математика", level:"easy", group:"Основы",
    intro:"+ - * / % — арифметика. ++ -- — инкремент/декремент. && || ! — логические. == != < > — сравнения.",
    syntax:`int a = 10, b = 3;\nint sum = a + b;        // 13\nint div = a / b;        // 3 (целочисленное деление!)\nint mod = a % b;        // 1\ndouble x = Math.sqrt(16); // 4.0\nint r = (int)(Math.random()*10);`,
    syntaxNote:"Деление двух int даёт int. Чтобы получить дробь — приведи к double."},
  {id:6, emoji:"📚", title:"Массивы", level:"easy", group:"Структуры",
    intro:"Массив — упорядоченная последовательность одного типа с фиксированной длиной.",
    syntax:`int[] nums = {1, 2, 3, 4, 5};\nint first = nums[0];        // 1\nint len = nums.length;      // 5\nString[] names = new String[3];\nnames[0] = "Аня";`,
    syntaxNote:"Длина массива неизменна. Для динамики используй ArrayList."},
  {id:7, emoji:"🧩", title:"Многомерные массивы", level:"mid", group:"Структуры",
    intro:"Массив массивов — используется для матриц, игровых полей, таблиц.",
    syntax:`int[][] grid = {\n  {1,2,3},\n  {4,5,6},\n  {7,8,9}\n};\nint x = grid[1][2]; // 6\nint rows = grid.length;\nint cols = grid[0].length;`,
    syntaxNote:"Сначала строка, потом столбец: grid[row][col]."},
  {id:8, emoji:"📋", title:"ArrayList", level:"easy", group:"Структуры",
    intro:"ArrayList — динамический массив-список из пакета java.util. Может расти и уменьшаться.",
    syntax:`import java.util.ArrayList;\nArrayList<String> list = new ArrayList<>();\nlist.add("яблоко");\nlist.add("груша");\nlist.get(0);     // "яблоко"\nlist.size();     // 2\nlist.remove(0);`,
    syntaxNote:"Используй <Type> — это generic, гарантирует тип элементов."},
  {id:9, emoji:"🔀", title:"Условия (if / else)", level:"easy", group:"Логика",
    intro:"Условия позволяют коду принимать решения на основе значений.",
    syntax:`int age = 14;\nif (age >= 18) {\n  System.out.println("Взрослый");\n} else if (age >= 12) {\n  System.out.println("Подросток");\n} else {\n  System.out.println("Ребёнок");\n}`,
    syntaxNote:"Условие в if должно быть boolean."},
  {id:10, emoji:"🎚️", title:"switch", level:"easy", group:"Логика",
    intro:"switch выбирает один из вариантов по значению. С Java 14 есть короткая switch-expression.",
    syntax:`int day = 3;\nswitch (day) {\n  case 1: System.out.println("Пн"); break;\n  case 2: System.out.println("Вт"); break;\n  case 3: System.out.println("Ср"); break;\n  default: System.out.println("?");\n}`,
    syntaxNote:"Не забывай break — иначе провалится в следующий case."},
  {id:11, emoji:"🔁", title:"Циклы (for, while)", level:"easy", group:"Логика",
    intro:"for, while, do-while повторяют код. for-each перебирает коллекции и массивы.",
    syntax:`for (int i = 0; i < 5; i++) {\n  System.out.println(i);\n}\nint n = 3;\nwhile (n > 0) { System.out.println(n); n--; }\nfor (String s : new String[]{"а","б"}) System.out.println(s);`,
    syntaxNote:"do-while гарантирует хотя бы одно выполнение тела."},
  {id:12, emoji:"🌀", title:"Вложенные циклы", level:"mid", group:"Логика",
    intro:"Цикл внутри цикла — для обхода матриц, генерации пар, рисования сеток.",
    syntax:`for (int y = 0; y < 3; y++) {\n  for (int x = 0; x < 3; x++) {\n    System.out.print(x + "," + y + " ");\n  }\n  System.out.println();\n}`,
    syntaxNote:"Внутренний цикл выполняется полностью на каждом шаге внешнего."},
  {id:13, emoji:"🛠️", title:"Методы", level:"easy", group:"Методы",
    intro:"Метод — именованный блок кода. Имеет тип возвращаемого значения, имя и параметры.",
    syntax:`public static int sum(int a, int b) {\n  return a + b;\n}\npublic static void greet(String name) {\n  System.out.println("Привет, " + name);\n}\n// sum(2, 3) → 5`,
    syntaxNote:"void — метод ничего не возвращает. static — метод класса, а не объекта."},
  {id:14, emoji:"📎", title:"Перегрузка методов (overloading)", level:"mid", group:"Методы",
    intro:"В одном классе может быть несколько методов с одним именем, но разными параметрами.",
    syntax:`int add(int a, int b) { return a + b; }\ndouble add(double a, double b) { return a + b; }\nint add(int a, int b, int c) { return a + b + c; }`,
    syntaxNote:"Компилятор выбирает нужную версию по типам и числу аргументов."},
  {id:15, emoji:"📦", title:"Varargs (переменные аргументы)", level:"mid", group:"Методы",
    intro:"Метод может принимать произвольное число аргументов одного типа.",
    syntax:`public static int sum(int... nums) {\n  int s = 0;\n  for (int n : nums) s += n;\n  return s;\n}\nsum(1, 2, 3, 4); // 10`,
    syntaxNote:"Внутри метода nums — обычный массив int[]."},
  {id:16, emoji:"🔭", title:"Область видимости (Scope)", level:"mid", group:"Методы",
    intro:"Локальные переменные видны только в своём блоке {…}. Поля класса доступны во всех методах класса.",
    syntax:`public class Demo {\n  int field = 10;          // поле\n  void m() {\n    int local = 5;         // локальная\n    System.out.println(field + local);\n  }\n}`,
    syntaxNote:"Локальная переменная не существует за пределами своих { }."},
  {id:17, emoji:"🔁", title:"Рекурсия", level:"hard", group:"Методы",
    intro:"Метод, вызывающий сам себя. Должно быть условие выхода, иначе StackOverflowError.",
    syntax:`public static int factorial(int n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}\nfactorial(5); // 120`,
    syntaxNote:"Каждый вызов кладёт кадр в стек — глубокая рекурсия его переполняет."},
  {id:18, emoji:"🏛️", title:"Классы и объекты", level:"easy", group:"ООП",
    intro:"Класс — чертёж. Объект — то, что создано по чертежу с помощью new.",
    syntax:`public class Dog {\n  String name;\n  void bark() {\n    System.out.println(name + ": Гав!");\n  }\n}\nDog d = new Dog();\nd.name = "Рекс";\nd.bark();`,
    syntaxNote:"new выделяет память под объект и возвращает ссылку на него."},
  {id:19, emoji:"🏗️", title:"Конструкторы", level:"easy", group:"ООП",
    intro:"Специальный метод, который вызывается при new. Имя совпадает с именем класса.",
    syntax:`public class Dog {\n  String name;\n  int age;\n  public Dog(String name, int age) {\n    this.name = name;\n    this.age = age;\n  }\n}\nDog d = new Dog("Рекс", 3);`,
    syntaxNote:"this — ссылка на текущий объект. Разрешает конфликт имён."},
  {id:20, emoji:"⚙️", title:"static — поля и методы класса", level:"mid", group:"ООП",
    intro:"static-член принадлежит классу, а не объекту. Доступен через имя класса.",
    syntax:`public class Counter {\n  static int count = 0;\n  static void inc() { count++; }\n}\nCounter.inc();\nCounter.inc();\nSystem.out.println(Counter.count); // 2`,
    syntaxNote:"Math.sqrt, Math.PI — это всё статика."},
  {id:21, emoji:"🛡️", title:"Инкапсуляция (private + геттеры)", level:"mid", group:"ООП",
    intro:"Поля скрывают через private, доступ дают через public-методы get/set. Это защищает данные от случайной порчи.",
    syntax:`public class Account {\n  private double balance;\n  public void deposit(double x) {\n    if (x > 0) balance += x;\n  }\n  public double getBalance() {\n    return balance;\n  }\n}`,
    syntaxNote:"Модификаторы доступа: private, default, protected, public."},
  {id:22, emoji:"🧬", title:"Наследование (extends)", level:"hard", group:"ООП",
    intro:"Класс может унаследовать поля и методы другого класса с помощью extends.",
    syntax:`class Animal {\n  void eat() { System.out.println("ем"); }\n}\nclass Cat extends Animal {\n  void meow() { System.out.println("мяу"); }\n}\nCat c = new Cat();\nc.eat(); c.meow();`,
    syntaxNote:"super — обращение к родителю. В Java одиночное наследование классов."},
  {id:23, emoji:"🎭", title:"Полиморфизм и @Override", level:"hard", group:"ООП",
    intro:"Один и тот же метод ведёт себя по-разному в зависимости от типа объекта. Подкласс может переопределить (override) метод родителя.",
    syntax:`class Animal {\n  void sound() { System.out.println("?"); }\n}\nclass Dog extends Animal {\n  @Override\n  void sound() { System.out.println("Гав"); }\n}\nAnimal a = new Dog();\na.sound(); // Гав`,
    syntaxNote:"@Override — аннотация, проверяющая, что метод реально переопределяет родительский."},
  {id:24, emoji:"📐", title:"Абстрактные классы", level:"hard", group:"ООП",
    intro:"abstract класс нельзя инстанцировать напрямую. Он может содержать абстрактные методы — без тела.",
    syntax:`abstract class Shape {\n  abstract double area();\n}\nclass Circle extends Shape {\n  double r;\n  Circle(double r) { this.r = r; }\n  double area() { return Math.PI * r * r; }\n}`,
    syntaxNote:"Подкласс обязан реализовать все абстрактные методы родителя."},
  {id:25, emoji:"🧩", title:"Интерфейсы (interface)", level:"hard", group:"ООП",
    intro:"Интерфейс — это контракт: список методов, которые класс обязуется реализовать. Класс может реализовать несколько интерфейсов.",
    syntax:`interface Flyable {\n  void fly();\n}\nclass Bird implements Flyable {\n  public void fly() {\n    System.out.println("Летит!");\n  }\n}`,
    syntaxNote:"С Java 8 интерфейсы могут иметь default-методы с реализацией."},
  {id:26, emoji:"🗂️", title:"Пакеты и import", level:"mid", group:"ООП",
    intro:"package объединяет связанные классы. import подключает их в другой файл.",
    syntax:`package com.school.app;\n\nimport java.util.ArrayList;\nimport java.util.Scanner;\n\npublic class Main { /* ... */ }`,
    syntaxNote:"java.lang импортируется автоматически (String, Math, System...)."},
  {id:27, emoji:"🚦", title:"Enum (перечисления)", level:"mid", group:"ООП",
    intro:"enum — тип с заранее заданным набором значений. Удобен для дней недели, статусов, направлений.",
    syntax:`enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }\nDay today = Day.WED;\nif (today == Day.WED) {\n  System.out.println("Среда");\n}`,
    syntaxNote:"enum — это полноценный класс, у него могут быть поля и методы."},
  {id:28, emoji:"⚠️", title:"Исключения (try/catch)", level:"mid", group:"Логика",
    intro:"Исключение — ошибка во время выполнения. try запускает «опасный» код, catch перехватывает ошибку, finally — выполняется всегда.",
    syntax:`try {\n  int x = Integer.parseInt("abc");\n} catch (NumberFormatException e) {\n  System.out.println("Не число: " + e.getMessage());\n} finally {\n  System.out.println("Готово");\n}`,
    syntaxNote:"throw — выбросить, throws — объявить, что метод может бросить."},
  {id:29, emoji:"🧪", title:"Свои исключения", level:"hard", group:"Логика",
    intro:"Можно создавать собственные классы-исключения, наследуясь от Exception или RuntimeException.",
    syntax:`class TooYoungException extends RuntimeException {\n  public TooYoungException(String msg) { super(msg); }\n}\nvoid checkAge(int age) {\n  if (age < 18) throw new TooYoungException("Только 18+");\n}`,
    syntaxNote:"Checked-исключения нужно объявлять в throws, RuntimeException — нет."},
  {id:30, emoji:"⌨️", title:"Ввод с клавиатуры (Scanner)", level:"easy", group:"I/O",
    intro:"Scanner читает данные из консоли, файлов и строк.",
    syntax:`import java.util.Scanner;\nScanner sc = new Scanner(System.in);\nSystem.out.print("Имя: ");\nString name = sc.nextLine();\nint age = sc.nextInt();\nSystem.out.println(name + ", " + age);`,
    syntaxNote:"Не забывай sc.close() в конце программы."},
  {id:31, emoji:"📄", title:"Чтение и запись файлов", level:"hard", group:"I/O",
    intro:"java.nio.file.Files — современный простой способ работать с файлами.",
    syntax:`import java.nio.file.*;\nimport java.util.List;\n\nFiles.writeString(Path.of("data.txt"), "Привет!");\nString text = Files.readString(Path.of("data.txt"));\nList<String> lines = Files.readAllLines(Path.of("data.txt"));`,
    syntaxNote:"Эти методы бросают IOException — нужно try/catch или throws."},
  {id:32, emoji:"🧬", title:"Generics (обобщения)", level:"hard", group:"Структуры",
    intro:"Параметризация типом: один и тот же код работает с разными типами безопасно.",
    syntax:`public class Box<T> {\n  private T value;\n  public void set(T v) { value = v; }\n  public T get() { return value; }\n}\nBox<String> b = new Box<>();\nb.set("Привет");`,
    syntaxNote:"T — параметр типа, заменяется реальным при использовании."},
  {id:33, emoji:"📚", title:"Collections: List, Set, Map", level:"hard", group:"Структуры",
    intro:"List — упорядоченный список (ArrayList). Set — множество без дубликатов (HashSet). Map — словарь ключ→значение (HashMap).",
    syntax:`import java.util.*;\nList<Integer> list = new ArrayList<>();\nSet<String> set = new HashSet<>();\nMap<String,Integer> map = new HashMap<>();\nmap.put("Аня", 12);\nint age = map.get("Аня");`,
    syntaxNote:"HashMap не сохраняет порядок. LinkedHashMap сохраняет."},
  {id:34, emoji:"🔁", title:"Итераторы и for-each", level:"mid", group:"Структуры",
    intro:"Iterator перебирает коллекцию вручную. for-each — короткая запись.",
    syntax:`List<String> names = List.of("Аня","Боря","Вика");\nfor (String n : names) {\n  System.out.println(n);\n}\nIterator<String> it = names.iterator();\nwhile (it.hasNext()) System.out.println(it.next());`,
    syntaxNote:"Внутри for-each нельзя удалять элементы — будет ConcurrentModificationException."},
  {id:35, emoji:"➡️", title:"Lambda-выражения", level:"hard", group:"Функции",
    intro:"С Java 8: короткая запись функции. Используется в Stream API и обработчиках событий.",
    syntax:`Runnable r = () -> System.out.println("Привет!");\nr.run();\n\nList<Integer> nums = List.of(1,2,3,4);\nnums.forEach(n -> System.out.println(n*2));`,
    syntaxNote:"Лямбда — это краткая запись объекта функционального интерфейса."},
  {id:36, emoji:"🌊", title:"Stream API", level:"hard", group:"Функции",
    intro:"Stream позволяет обрабатывать коллекции в декларативном стиле: filter, map, reduce, collect.",
    syntax:`import java.util.*;\nimport java.util.stream.*;\nList<Integer> nums = List.of(1,2,3,4,5);\nint sum = nums.stream()\n  .filter(n -> n % 2 == 0)\n  .mapToInt(Integer::intValue)\n  .sum(); // 6`,
    syntaxNote:"Stream — одноразовый: после терминальной операции его нельзя использовать снова."},
  {id:37, emoji:"🧵", title:"Многопоточность (Thread)", level:"hard", group:"Продвинутое",
    intro:"Thread позволяет выполнять код параллельно. Базовые способы: extends Thread или implements Runnable.",
    syntax:`Runnable task = () -> {\n  for (int i = 0; i < 3; i++)\n    System.out.println("Поток: " + i);\n};\nThread t = new Thread(task);\nt.start();\nt.join(); // ждать завершения`,
    syntaxNote:"start() запускает новый поток, run() — просто вызвал бы метод в текущем."},
  {id:38, emoji:"🗄️", title:"JDBC — работа с базой данных", level:"hard", group:"Продвинутое",
    intro:"JDBC — стандартный API для работы с SQL-базами из Java.",
    syntax:`import java.sql.*;\nConnection c = DriverManager.getConnection(\n  "jdbc:sqlite:my.db");\nStatement st = c.createStatement();\nResultSet rs = st.executeQuery("SELECT name FROM users");\nwhile (rs.next()) {\n  System.out.println(rs.getString("name"));\n}\nc.close();`,
    syntaxNote:"Используй PreparedStatement против SQL-инъекций."},
  {id:39, emoji:"🏗️", title:"Maven и Gradle (build tools)", level:"mid", group:"Продвинутое",
    intro:"Системы сборки автоматически скачивают библиотеки, компилируют, тестируют и упаковывают проект.",
    syntax:`<!-- pom.xml (Maven) -->\n<dependencies>\n  <dependency>\n    <groupId>org.junit.jupiter</groupId>\n    <artifactId>junit-jupiter</artifactId>\n    <version>5.10.0</version>\n  </dependency>\n</dependencies>`,
    syntaxNote:"mvn compile, mvn test, mvn package — типичные команды."},
  {id:40, emoji:"🎮", title:"Мини-проекты", level:"hard", group:"Проекты",
    intro:"Применим знания: калькулятор, игра «угадай число», банковский счёт, todo-лист в файле, простой чат.",
    syntax:`import java.util.*;\npublic class Guess {\n  public static void main(String[] a) {\n    int secret = (int)(Math.random()*100)+1;\n    Scanner sc = new Scanner(System.in);\n    int g;\n    do {\n      System.out.print("? ");\n      g = sc.nextInt();\n      System.out.println(g < secret ? "Больше" :\n                         g > secret ? "Меньше" : "Угадал!");\n    } while (g != secret);\n  }\n}`,
    syntaxNote:"Сочетай классы, методы, ввод-вывод, циклы и условия."}
];



function wrapProgram(snippet){
  const trimmed = (snippet||'').trim();
  if (/\bclass\s+\w+/.test(trimmed) && /\bpublic\s+static\s+void\s+main\s*\(/.test(trimmed)){
    return trimmed;
  }
  const imports = new Set();
  if (/\bScanner\b/.test(trimmed)) imports.add("import java.util.Scanner;");
  if (/\b(ArrayList|LinkedList|HashMap|LinkedHashMap|TreeMap|HashSet|LinkedHashSet|TreeSet|Stack|Queue|Deque|ArrayDeque|PriorityQueue|Iterator|Collections|Arrays|List|Map|Set)\b/.test(trimmed))
    imports.add("import java.util.*;");
  if (/\b(Files|Paths|Path)\b/.test(trimmed)) imports.add("import java.nio.file.*;");
  if (/\b(Stream|Collectors|IntStream)\b/.test(trimmed)) imports.add("import java.util.stream.*;");
  if (/\bIOException\b/.test(trimmed)) imports.add("import java.io.IOException;");
  const importStr = imports.size ? [...imports].join("\n") + "\n\n" : "";
  const indent = (str, n) => str.split("\n").map(l => " ".repeat(n) + l).join("\n");
  const hasClass = /\b(class|interface|enum)\s+\w+/.test(trimmed);
  if (hasClass){
    if (/\bpublic\s+static\s+void\s+main\b/.test(trimmed)) return importStr + trimmed;
    return importStr + trimmed + "\n\nclass Demo {\n  public static void main(String[] args) {\n    System.out.println(\"Программа скомпилирована. См. классы выше.\");\n  }\n}";
  }
  return importStr + "public class Main {\n  public static void main(String[] args) {\n" + indent(trimmed, 4) + "\n  }\n}";
}

function makeExamples(topic){
  // Если есть кастомные примеры по теме — используем их.
  const custom = (typeof TOPIC_EXAMPLES !== "undefined") && TOPIC_EXAMPLES[topic.id];
  if (custom && custom.length){
    return custom.map((ex, idx) => ({
      title: ex.title || `${topic.title} — пример ${idx+1}`,
      level: idx < 5 ? "Новичок" : idx < 10 ? "Средний" : "Продвинутый",
      code: ex.code,
      output: ex.output,
      explanation: ex.explanation || `Пример темы «${topic.title}».`
    }));
  }
  const out = [];
  for (let i = 1; i <= 15; i++){
    out.push({
      title: `${topic.title} — пример ${i}`,
      level: i <= 5 ? "Новичок" : i <= 10 ? "Средний" : "Продвинутый",
      code: topic.syntax + `\nprint("Пример ${i} темы: ${topic.title}")`,
      output: `Пример ${i} темы: ${topic.title}`,
      explanation: `Это ${i}-й пример темы «${topic.title}».`
    });
  }
  return out;
}


function makeQuiz(topic){
  const c = (typeof TOPIC_CONTENT!=="undefined") && TOPIC_CONTENT[topic.id];
  if (c && c.quiz) return c.quiz;
  return [{q:`Тема: ${topic.title}`, opts:["A","B","C","D"], answer:0}];
}


function makeTasks(topic){
  const c = (typeof TOPIC_CONTENT!=="undefined") && TOPIC_CONTENT[topic.id];
  if (c && c.tasks) return c.tasks;
  return [{q:`Задание по теме «${topic.title}»`, hint:"См. синтаксис темы.", solution:"# решение"}];
}


function makeBugs(){
  return BUG_LIST.map((b, idx) => ({
    title: `Программа №${idx+1} — ${b.title}`,
    level: idx < 7 ? "Новичок" : idx < 14 ? "Средний" : "Продвинутый",
    oop: !!b.oop,
    broken: b.broken,
    fixed: b.fixed,
    errors: b.errors
  }));
}

const BUG_LIST = [
  {
    title: "Hello, Java — куча опечаток",
    broken:
`Public Class Main {
  public Static void Main(String args) {
    System.out.Println("Hello Java")
  }
}`,
    fixed:
`public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, Java!");
  }
}`,
    errors: [
      "Public — должно быть public (с маленькой)",
      "Class — должно быть class",
      "Static — должно быть static",
      "Main — точка входа должна называться main",
      "Параметр main: String[] args, а не String args",
      "Println — должно быть println (с маленькой)",
      "Нет точки с запятой в конце вызова println"
    ]
  },
  {
    title: "Сумма двух чисел",
    broken:
`public class Sum {
  public static void main(String[] args) {
    int a = 5
    Int b = "3";
    int sum = a + b
    system.out.println("Сумма: " + Sum);
  }
}`,
    fixed:
`public class Sum {
  public static void main(String[] args) {
    int a = 5;
    int b = 3;
    int sum = a + b;
    System.out.println("Сумма: " + sum);
  }
}`,
    errors: [
      "Нет ; после int a = 5",
      "Int должно быть int (с маленькой)",
      "\"3\" — это строка, а нужно число 3",
      "Нет ; после int sum = a + b",
      "system — должно быть System (с большой)",
      "Sum — это имя класса, а переменная sum"
    ]
  },
  {
    title: "Чётное или нечётное",
    broken:
`public class Even {
  public static void main(String[] args) {
    int n = 7;
    if n % 2 = 0 {
      System.out.println("Чётное")
    } Else
      System.out.println("Нечётное");
  }
}`,
    fixed:
`public class Even {
  public static void main(String[] args) {
    int n = 7;
    if (n % 2 == 0) {
      System.out.println("Чётное");
    } else {
      System.out.println("Нечётное");
    }
  }
}`,
    errors: [
      "Условие if должно быть в круглых скобках",
      "= — это присваивание, для сравнения нужно ==",
      "Нет ; после println(\"Чётное\")",
      "Else должно быть else (с маленькой)",
      "Тело else лучше брать в { } для надёжности"
    ]
  },
  {
    title: "Цикл for от 1 до 5",
    broken:
`public class Loop {
  public static void main(String[] args) {
    For (int i = 1, i < 5, i++) {
      System.out.println(i)
    }
  }
}`,
    fixed:
`public class Loop {
  public static void main(String[] args) {
    for (int i = 1; i <= 5; i++) {
      System.out.println(i);
    }
  }
}`,
    errors: [
      "For должно быть for (с маленькой)",
      "В for разделители — ;, а не запятая",
      "i < 5 даст числа 1..4, нужно i <= 5",
      "Нет ; в конце println(i)"
    ]
  },
  {
    title: "Сравнение строк",
    broken:
`public class Cmp {
  public static void main(String[] args) {
    String a = "Привет";
    String b = "Привет";
    if (a == b)
      System.out.Println("Равны");
    else
      system.out.println("Разные");
  }
}`,
    fixed:
`public class Cmp {
  public static void main(String[] args) {
    String a = "Привет";
    String b = "Привет";
    if (a.equals(b)) {
      System.out.println("Равны");
    } else {
      System.out.println("Разные");
    }
  }
}`,
    errors: [
      "Строки в Java сравнивай через .equals(), не через ==",
      "Println — должно быть println (с маленькой)",
      "system — должно быть System (с большой)",
      "Хорошо бы взять тела в { } для читаемости"
    ]
  },
  {
    title: "Массив и его длина",
    broken:
`public class Arr {
  public static void main(String[] args) {
    int[] nums = {1, 2, 3, 4, 5};
    for (int i = 0; i <= nums.length; i++) {
      System.out.println(nums(i));
    }
  }
}`,
    fixed:
`public class Arr {
  public static void main(String[] args) {
    int[] nums = {1, 2, 3, 4, 5};
    for (int i = 0; i < nums.length; i++) {
      System.out.println(nums[i]);
    }
  }
}`,
    errors: [
      "i <= nums.length выйдет за границы — нужно i < nums.length",
      "Элементы массива — nums[i], а не nums(i)",
      ".length — это поле, без скобок"
    ]
  },
  {
    title: "Метод суммы",
    broken:
`public class M {
  public static sum(a, b) {
    return a + b
  }
  public static void main(String args) {
    println(sum(2, 3));
  }
}`,
    fixed:
`public class M {
  public static int sum(int a, int b) {
    return a + b;
  }
  public static void main(String[] args) {
    System.out.println(sum(2, 3));
  }
}`,
    errors: [
      "Не указан тип возвращаемого значения у sum",
      "Параметры метода должны иметь тип: int a, int b",
      "Нет ; после return a + b",
      "Параметр main: String[] args, а не String args",
      "println — нужно полное имя System.out.println"
    ]
  },
  {
    title: "Класс Dog с конструктором",
    broken:
`class dog {
  string Name;
  int Age;
  public Dog(String name, int age) {
    Name = name;
    age = age;
  }
  public void bark() {
    System.out.println(Name + ": Woof!");
  }
}
public class Main {
  public static void main(String[] args) {
    dog d = Dog("Rex", 3);
    d.Bark();
  }
}`,
    fixed:
`class Dog {
  String name;
  int age;
  public Dog(String name, int age) {
    this.name = name;
    this.age = age;
  }
  public void bark() {
    System.out.println(name + ": Woof!");
  }
}
public class Main {
  public static void main(String[] args) {
    Dog d = new Dog("Rex", 3);
    d.bark();
  }
}`,
    errors: [
      "Имена классов с большой буквы: Dog, а не dog",
      "string должно быть String",
      "Имя конструктора должно совпадать с классом: Dog",
      "age = age затирает параметр — нужно this.age = age",
      "Создание объекта через new: new Dog(...)",
      "Имена методов с маленькой: bark, а не Bark"
    ],
    oop: true
  },
  {
    title: "Наследование Animal/Cat",
    broken:
`class Animal {
  public void eat() {
    System.out.println("ем");
  }
}
class Cat Extends Animal {
  @override
  public void Eat() {
    super.Eat();
    System.out.println("мяу");
  }
}
public class Main {
  public static void main(String[] args) {
    Animal c = Cat();
    c.eat()
  }
}`,
    fixed:
`class Animal {
  public void eat() {
    System.out.println("ем");
  }
}
class Cat extends Animal {
  @Override
  public void eat() {
    super.eat();
    System.out.println("мяу");
  }
}
public class Main {
  public static void main(String[] args) {
    Animal c = new Cat();
    c.eat();
  }
}`,
    errors: [
      "Extends должно быть extends (с маленькой)",
      "@override должно быть @Override (с большой)",
      "Имена методов с маленькой: eat, а не Eat",
      "super.Eat() — должно быть super.eat()",
      "Создание объекта через new Cat()",
      "Нет ; после c.eat()"
    ],
    oop: true
  },
  {
    title: "ArrayList — добавление и вывод",
    broken:
`import java.util.*
public class L {
  public static void main(String[] args) {
    ArrayList<int> list = new ArrayList();
    list.Add(1);
    list.add("два");
    for (int i = 0; i < list.length; i++)
      System.out.println(list.get(i))
  }
}`,
    fixed:
`import java.util.*;
public class L {
  public static void main(String[] args) {
    ArrayList<Integer> list = new ArrayList<>();
    list.add(1);
    list.add(2);
    for (int i = 0; i < list.size(); i++) {
      System.out.println(list.get(i));
    }
  }
}`,
    errors: [
      "Нет ; после import java.util.*",
      "В дженериках нельзя примитив: <Integer>, а не <int>",
      "После new ArrayList должны быть <> (диамант)",
      "Имя метода — add (с маленькой)",
      "В список <Integer> нельзя класть строку \"два\"",
      "У ArrayList размер — .size(), а не .length",
      "Нет ; после println"
    ]
  },
  {
    title: "switch без break",
    broken:
`public class Day {
  public static void main(String[] args) {
    int day = 2;
    switch day {
      case 1 System.out.println("Пн");
      case 2 System.out.println("Вт");
      case 3 System.out.println("Ср");
      Default System.out.println("?");
    }
  }
}`,
    fixed:
`public class Day {
  public static void main(String[] args) {
    int day = 2;
    switch (day) {
      case 1: System.out.println("Пн"); break;
      case 2: System.out.println("Вт"); break;
      case 3: System.out.println("Ср"); break;
      default: System.out.println("?");
    }
  }
}`,
    errors: [
      "switch требует круглые скобки вокруг значения",
      "После case нужен :",
      "Без break будет проваливание в следующий case",
      "Default должно быть default (с маленькой)"
    ]
  },
  {
    title: "try/catch — парсинг числа",
    broken:
`public class T {
  public static void main(String[] args) {
    String s = "abc";
    Try {
      int x = integer.ParseInt(s);
      System.out.println(x);
    } catch (e) {
      System.out.println("Ошибка: " + e.message);
    }
  }
}`,
    fixed:
`public class T {
  public static void main(String[] args) {
    String s = "abc";
    try {
      int x = Integer.parseInt(s);
      System.out.println(x);
    } catch (NumberFormatException e) {
      System.out.println("Ошибка: " + e.getMessage());
    }
  }
}`,
    errors: [
      "Try — должно быть try (с маленькой)",
      "Integer.parseInt — класс с большой буквы, метод с маленькой",
      "В catch нужно указать тип исключения: NumberFormatException e",
      "У Exception сообщение — getMessage(), а не .message"
    ]
  },
  {
    title: "Scanner — ввод имени",
    broken:
`import java.util.scanner;
public class In {
  public static void main(String[] args) {
    scanner sc = new scanner(System.in);
    String name = sc.NextLine();
    System.out.println("Привет " + name)
    sc.Close();
  }
}`,
    fixed:
`import java.util.Scanner;
public class In {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    String name = sc.nextLine();
    System.out.println("Привет " + name);
    sc.close();
  }
}`,
    errors: [
      "Имя класса Scanner — с большой буквы (в import и при создании)",
      "Метод nextLine() — с маленькой n",
      "Нет ; после println",
      "Метод close() — с маленькой буквы"
    ]
  },
  {
    title: "Полиморфизм Shape",
    broken:
`abstract class shape {
  abstract double Area();
}
class circle extends shape {
  double r;
  circle(double r) { this.r = r }
  double area() { return 3.14 * r ** 2; }
}
public class Main {
  public static void main(String[] args) {
    shape s = circle(5);
    System.out.println(s.area())
  }
}`,
    fixed:
`abstract class Shape {
  abstract double area();
}
class Circle extends Shape {
  double r;
  Circle(double r) { this.r = r; }
  double area() { return Math.PI * r * r; }
}
public class Main {
  public static void main(String[] args) {
    Shape s = new Circle(5);
    System.out.println(s.area());
  }
}`,
    errors: [
      "Имена классов с большой: Shape, Circle",
      "Имя абстрактного метода с маленькой: area",
      "Имя конструктора = имени класса: Circle",
      "Нет ; в this.r = r",
      "В Java нет оператора ** — используй Math.pow или r*r",
      "Создание через new Circle(5)",
      "Нет ; после println"
    ],
    oop: true
  },
  {
    title: "HashMap — словарь",
    broken:
`import java.util.*;
public class M {
  public static void main(String[] args) {
    HashMap<String, int> ages = new HashMap();
    ages.Put("Аня", 12);
    ages.put("Боря" 14);
    System.out.println(ages.Get("Аня"));
    if (ages.containsKey("Вика") = false)
      System.out.println("нет");
  }
}`,
    fixed:
`import java.util.*;
public class M {
  public static void main(String[] args) {
    HashMap<String, Integer> ages = new HashMap<>();
    ages.put("Аня", 12);
    ages.put("Боря", 14);
    System.out.println(ages.get("Аня"));
    if (!ages.containsKey("Вика"))
      System.out.println("нет");
  }
}`,
    errors: [
      "В дженериках только классы: <Integer>, а не <int>",
      "После new HashMap нужны <>",
      "Метод put — с маленькой буквы",
      "Между \"Боря\" и 14 нужна запятая",
      "Метод get — с маленькой буквы",
      "= это присваивание; для отрицания используй !ages.containsKey(...)"
    ]
  },
  {
    title: "Интерфейс Flyable",
    broken:
`interface flyable {
  void Fly()
}
class Bird Implements flyable {
  public void Fly() {
    System.out.println("Летит");
  }
}
public class Main {
  public static void main(String[] args) {
    flyable b = Bird();
    b.fly();
  }
}`,
    fixed:
`interface Flyable {
  void fly();
}
class Bird implements Flyable {
  @Override
  public void fly() {
    System.out.println("Летит");
  }
}
public class Main {
  public static void main(String[] args) {
    Flyable b = new Bird();
    b.fly();
  }
}`,
    errors: [
      "Имя интерфейса с большой: Flyable",
      "Имя метода с маленькой: fly",
      "После Fly() в интерфейсе нужна ;",
      "Implements должно быть implements (с маленькой)",
      "Создание объекта через new Bird()"
    ],
    oop: true
  },
  {
    title: "Lambda и forEach",
    broken:
`import java.util.*;
public class L {
  public static void main(String[] args) {
    List<int> nums = List.of(1, 2, 3);
    nums.foreach(n => System.out.println(n))
  }
}`,
    fixed:
`import java.util.*;
public class L {
  public static void main(String[] args) {
    List<Integer> nums = List.of(1, 2, 3);
    nums.forEach(n -> System.out.println(n));
  }
}`,
    errors: [
      "В дженериках классы: <Integer>, а не <int>",
      "Имя метода — forEach (с большой E в середине)",
      "Стрелка лямбды в Java: -> (а не =>)",
      "Нет ; в конце"
    ]
  },
  {
    title: "Stream — сумма чётных",
    broken:
`import java.util.*
public class S {
  public static void main(String[] args) {
    List<Integer> nums = List.of(1,2,3,4,5);
    int sum = nums.Stream()
      .Filter(n => n % 2 = 0)
      .Sum()
    System.out.println(sum)
  }
}`,
    fixed:
`import java.util.*;
public class S {
  public static void main(String[] args) {
    List<Integer> nums = List.of(1,2,3,4,5);
    int sum = nums.stream()
      .filter(n -> n % 2 == 0)
      .mapToInt(Integer::intValue)
      .sum();
    System.out.println(sum);
  }
}`,
    errors: [
      "Нет ; после import",
      "Имя метода stream — с маленькой s",
      "filter — с маленькой f",
      "Стрелка лямбды: -> (а не =>)",
      "Сравнение — == (а не =)",
      "Чтобы вызвать .sum(), нужен IntStream — добавь .mapToInt(...)",
      "Нет ; после .sum()",
      "Нет ; после println"
    ]
  },
  {
    title: "Файлы — запись и чтение",
    broken:
`import java.nio.file.*;
public class F {
  public static void main(String[] args) {
    Files.WriteString(Path.of("data.txt"), "Привет");
    string text = Files.ReadString(Path.Of("data.txt"));
    System.out.println(text)
  }
}`,
    fixed:
`import java.nio.file.*;
import java.io.IOException;
public class F {
  public static void main(String[] args) throws IOException {
    Files.writeString(Path.of("data.txt"), "Привет");
    String text = Files.readString(Path.of("data.txt"));
    System.out.println(text);
  }
}`,
    errors: [
      "Эти методы бросают IOException — добавь throws IOException",
      "writeString — с маленькой w",
      "readString — с маленькой r",
      "Path.of — с маленькой o",
      "string должно быть String (с большой)",
      "Нет ; после println"
    ]
  },
  {
    title: "Многопоточность Thread",
    broken:
`public class T {
  public static void main(String[] args) {
    runnable task = () => {
      for (int i = 0, i < 3, i++) {
        System.out.println("Поток: " + i);
      }
    };
    thread t = thread(task);
    t.run();
  }
}`,
    fixed:
`public class T {
  public static void main(String[] args) {
    Runnable task = () -> {
      for (int i = 0; i < 3; i++) {
        System.out.println("Поток: " + i);
      }
    };
    Thread t = new Thread(task);
    t.start();
  }
}`,
    errors: [
      "Runnable и Thread пишутся с большой буквы",
      "Стрелка лямбды в Java: -> (а не =>)",
      "В for разделители — ; (а не запятая)",
      "Создание объекта через new Thread(...)",
      "Для запуска нового потока используй start(), а не run()"
    ]
  }
];


const AI_TASKS = [
  // ===== EASY: переменные, типы, операторы, ввод/вывод, условия =====
  {id:"ai1", title:"#1. 🔤 Переменные и типы данных", desc:"Напиши Java-программу, которая объявляет переменные всех основных типов (int, double, char, boolean, String) и выводит их в консоль. Попроси AI проверить, правильно ли подобраны типы.", hint:"Промт: «Проверь мой Java код: правильно ли я выбрал типы данных для переменных? <код>».", level:"easy"},
  {id:"ai2", title:"#2. ➕ Арифметические операторы", desc:"Сделай калькулятор для двух чисел: +, −, *, /, %. Попроси AI объяснить, почему 5/2 даёт 2, а не 2.5, и как это исправить.", hint:"Промт: «Объясни целочисленное деление в Java и как получить дробный результат».", level:"easy"},
  {id:"ai3", title:"#3. 🔁 Перевод единиц", desc:"Программа читает температуру в °C через Scanner и выводит в °F. Попроси AI добавить проверку ввода и комментарии к каждой строке.", hint:"Промт: «Добавь подробные комментарии и обработку некорректного ввода к этому Java коду: <код>».", level:"easy"},
  {id:"ai4", title:"#4. 🚦 if / else", desc:"Напиши программу: ввод возраста → вывод «ребёнок / подросток / взрослый / пенсионер». Попроси AI переписать решение через switch и сравни читаемость.", hint:"Промт: «Перепиши этот if/else на switch в Java и объясни плюсы/минусы: <код>».", level:"easy"},
  {id:"ai5", title:"#5. 🔂 Циклы for / while", desc:"Выведи таблицу умножения на N (N вводит пользователь) с помощью вложенных циклов. Попроси AI показать тот же результат через while и do-while.", hint:"Промт: «Покажи три варианта таблицы умножения в Java: for, while, do-while».", level:"easy"},
  {id:"ai6", title:"#6. 🐞 Debug: бесконечный цикл", desc:"Дай AI код с while(i<10){ System.out.println(i); } (без i++). Попроси найти ошибку, объяснить её и привести исправленный вариант.", hint:"Промт: «Найди ошибку в этом Java коде и объясни, почему программа зависает: <код>».", level:"easy"},
  {id:"ai7", title:"#7. ⚖️ Логические операторы", desc:"Программа определяет, является ли год високосным (правила: делится на 4 и не на 100, либо делится на 400). Попроси AI проверить логику на 2000, 1900, 2024, 2023.", hint:"Промт: «Проверь правильность условия високосного года в Java и протестируй на 4 значениях: <код>».", level:"easy"},
  {id:"ai8", title:"#8. 🧾 Работа со String", desc:"Прочитай строку, выведи её длину, в верхнем регистре, в обратном порядке и количество гласных. Попроси AI объяснить разницу между == и .equals().", hint:"Промт: «Объясни на примерах, почему == не подходит для сравнения String в Java».", level:"easy"},

  // ===== MID: методы, массивы, ArrayList, ООП основы =====
  {id:"ai9", title:"#9. 🧩 Методы и параметры", desc:"Вынеси повторяющийся код калькулятора в отдельные методы add, sub, mul, div. Попроси AI объяснить, что такое сигнатура метода и перегрузка (overloading).", hint:"Промт: «Объясни перегрузку методов в Java на простом примере с методом add()».", level:"mid"},
  {id:"ai10", title:"#10. 🔄 Рекурсия vs цикл", desc:"Напиши факториал двумя способами: циклом и рекурсией. Попроси AI сравнить производительность и читаемость, и подсказать, когда что выбирать.", hint:"Промт: «Сравни рекурсивный и циклический факториал в Java: плюсы, минусы, переполнение стека».", level:"mid"},
  {id:"ai11", title:"#11. 📦 Массивы", desc:"Заполни массив int[20] случайными числами и найди минимум, максимум, среднее. Попроси AI добавить вариант через Stream API и объяснить его.", hint:"Промт: «Покажи решение через классический for и через Stream API в Java: <задача>».", level:"mid"},
  {id:"ai12", title:"#12. 📋 ArrayList — список задач", desc:"Сделай консольное To-Do: добавить, удалить по индексу, вывести, очистить. Попроси AI объяснить разницу между массивом и ArrayList.", hint:"Промт: «Чем ArrayList отличается от обычного массива в Java? Когда что использовать?».", level:"mid"},
  {id:"ai13", title:"#13. 🐞 Debug: выход за границы массива", desc:"Дай AI код, где цикл идёт for(int i=0;i<=arr.length;i++). Попроси найти ArrayIndexOutOfBoundsException, объяснить и исправить.", hint:"Промт: «Объясни ArrayIndexOutOfBoundsException и исправь код: <код>».", level:"mid"},
  {id:"ai14", title:"#14. 🏛️ Класс и объект", desc:"Создай класс Student (имя, класс, средний балл) с конструктором и методом print(). Создай 3 объекта. Попроси AI улучшить класс согласно стандартам Java.", hint:"Промт: «Преврати этот класс Student в правильный Java POJO с конструктором, геттерами/сеттерами и toString()».", level:"mid"},
  {id:"ai15", title:"#15. 🔒 Инкапсуляция", desc:"Сделай поля класса BankAccount приватными, добавь методы deposit() и withdraw() с проверкой суммы. Попроси AI объяснить, зачем нужна инкапсуляция, на примере без неё.", hint:"Промт: «Покажи на примере BankAccount, что может пойти не так без инкапсуляции в Java».", level:"mid"},
  {id:"ai16", title:"#16. 🧱 Конструкторы и this", desc:"Сделай класс Book с несколькими конструкторами (только title; title+author; всё). Попроси AI объяснить ключевые слова this и this(...).", hint:"Промт: «Объясни this и вызов this(...) между конструкторами в Java на примере класса Book».", level:"mid"},
  {id:"ai17", title:"#17. 🐞 Debug: NullPointerException", desc:"Дай AI код, где String s = null; s.length(); вызывает NPE. Попроси найти причину, объяснить и показать 2 способа защиты.", hint:"Промт: «Объясни NullPointerException и покажи 2 безопасных варианта проверки в Java».", level:"mid"},

  // ===== HARD: наследование, полиморфизм, исключения, проекты =====
  {id:"ai18", title:"#18. 🧬 Наследование", desc:"Создай класс Animal с методом sound(), наследников Dog, Cat, Cow, переопредели sound(). В main создай массив Animal[] и вызови sound() для каждого.", hint:"Промт: «Объясни наследование и переопределение методов (@Override) в Java на примере Animal».", level:"hard"},
  {id:"ai19", title:"#19. 🎭 Полиморфизм", desc:"На основе классов из задания #18 покажи, как ссылка Animal a = new Dog(); вызывает правильный sound(). Попроси AI объяснить, что такое динамическое связывание.", hint:"Промт: «Объясни полиморфизм и динамическое связывание в Java на простом примере».", level:"hard"},
  {id:"ai20", title:"#20. 🧰 Абстрактный класс и интерфейс", desc:"Сделай интерфейс Shape с методом area(). Реализуй в классах Circle, Rectangle, Triangle. Выведи площади. Попроси AI объяснить разницу между abstract class и interface.", hint:"Промт: «Чем abstract class отличается от interface в Java? Когда выбирать что?».", level:"hard"},
  {id:"ai21", title:"#21. 🛡️ try / catch / finally", desc:"Прочитай число через Scanner, перехвати NumberFormatException и попроси ввести снова. Попроси AI добавить блок finally и объяснить, когда он выполняется.", hint:"Промт: «Объясни порядок выполнения try/catch/finally в Java и приведи пример с Scanner».", level:"hard"},
  {id:"ai22", title:"#22. 🐞 Debug: ловим неправильное исключение", desc:"Дай AI код, где catch(Exception e) перехватывает всё подряд и съедает баги. Попроси AI указать на проблему и переписать с конкретными исключениями.", hint:"Промт: «Почему catch(Exception e) — это анти-паттерн в Java? Перепиши код правильно: <код>».", level:"hard"},
  {id:"ai23", title:"#23. 🏪 Мини-проект: магазин", desc:"Классы Product, Cart (ArrayList<Product>), методы add, remove, total. Консольное меню. Попроси AI провести код-ревью по принципам ООП.", hint:"Промт: «Сделай код-ревью моего магазина на Java: инкапсуляция, имена, ответственность классов: <код>».", level:"hard"},
  {id:"ai24", title:"#24. 📚 Мини-проект: библиотека", desc:"Класс Library хранит ArrayList<Book>. Методы: addBook, removeBook, findByAuthor, findByTitle. Обработай исключения, если книга не найдена.", hint:"Промт: «Помоги спроектировать класс Library в Java: какие методы нужны и какие исключения бросать».", level:"hard"},
  {id:"ai25", title:"#25. 🏆 Финальный проект: дневник учёбы", desc:"Объедини всё: классы Subject и Grade, ArrayList оценок, методы добавления/удаления, средний балл, обработка исключений, меню в консоли. Попроси AI помочь с рефакторингом и составить список тестов.", hint:"Промт: «Сделай рефакторинг моего Java-проекта по ООП-принципам и предложи 10 тест-кейсов: <код>».", level:"hard"}
];


const ACHIEVEMENTS = [
  {id:"first", name:"🎉 Первые шаги", desc:"Открой первую тему"},
  {id:"five", name:"🔥 На разогреве", desc:"Изучи 5 тем"},
  {id:"half", name:"🏅 Половина пути", desc:"Изучи 20 тем"},
  {id:"all", name:"👑 Мастер Java", desc:"Изучи все 40 тем"},
  {id:"quiz", name:"🧠 Эрудит", desc:"Пройди первый квиз"},
  {id:"quiz5", name:"🎓 Квиз-мастер", desc:"Пройди 5 викторин"},
  {id:"debug1", name:"🐛 Охотник за багами", desc:"Реши первый debug"},
  {id:"debug10", name:"🛠️ Инженер", desc:"Реши 10 debug-программ"},
  {id:"xp100", name:"⭐ 100 XP", desc:"Заработай 100 XP"},
  {id:"xp500", name:"🌟 500 XP", desc:"Заработай 500 XP"},
  {id:"xp1000", name:"💎 1000 XP", desc:"Заработай 1000 XP"}
];

const STATE_KEY = "javaacademy_state_v1";
const state = loadState();
function loadState(){
  try { return JSON.parse(localStorage.getItem(STATE_KEY)) || initState(); }
  catch { return initState(); }
}
function initState(){ return {xp:0, done:{}, quizDone:{}, debugDone:{}, aiDone:{}, achievements:{}, theme:"light", profile:null}; }
function saveState(){ localStorage.setItem(STATE_KEY, JSON.stringify(state)); }

// Real-time profile refresh bus — other modules register via window.PA_onStateChange
function notifyStateChange(){
  try{ if (typeof window.PA_refreshProfile === 'function') window.PA_refreshProfile(); }catch(e){}
}

function addXP(n){
  state.xp += n;
  if (state.xp >= 100) unlock("xp100");
  if (state.xp >= 500) unlock("xp500");
  if (state.xp >= 1000) unlock("xp1000");
  saveState(); renderTop(); notifyStateChange();
}
function markDone(id){ state.done[id] = true; saveState(); renderTop(); renderSidebar(); notifyStateChange(); }
function unlock(id){
  if (state.achievements[id]) return;
  state.achievements[id] = true; saveState();
  toast(`🏆 Достижение: ${ACHIEVEMENTS.find(a=>a.id===id)?.name||id}`);
  notifyStateChange();
}

const KEYWORDS = /\b(abstract|assert|break|case|catch|class|const|continue|default|do|else|enum|extends|final|finally|for|goto|if|implements|import|instanceof|interface|native|new|package|private|protected|public|return|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|volatile|while|true|false|null|var|record|sealed|yield)\b/g;
const BUILTINS = /\b(int|long|short|byte|float|double|char|boolean|void|String|Integer|Double|Boolean|Character|Object|List|ArrayList|Map|HashMap|Set|HashSet|Scanner|Math|System|Thread|Runnable|Iterator|Exception|RuntimeException|IOException|NumberFormatException|Files|Path|Optional|Stream|println|print|printf)\b/g;
function highlight(code){
  return code
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(KEYWORDS,'<span class="tok-key">$1</span>')
    .replace(BUILTINS,'<span class="tok-fn">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g,'<span class="tok-num">$1</span>');
}

let currentView = {type:"home"};
let searchQuery = "";
let levelFilter = "all";

function $(sel){ return document.querySelector(sel); }
function el(tag, props={}, ...children){
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k,v])=>{
    if (k==="class") e.className = v;
    else if (k==="html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children.flat().forEach(c => e.appendChild(typeof c==="string" ? document.createTextNode(c) : c));
  return e;
}

function toast(msg){
  const t = el("div", {class:"toast"}, msg);
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2800);
}

function renderTop(){
  const total = TOPICS.length;
  const doneCount = Object.keys(state.done).filter(k=>k.startsWith("t")).length;
  const pct = Math.round((doneCount/total)*100);
  const bar = $("#progress-bar"); if (bar) bar.style.width = pct + "%";
  const xp = $("#xp-val"); if (xp) xp.textContent = state.xp;
  const pctEl = $("#pct"); if (pctEl) pctEl.textContent = pct + "%";
}

function renderSidebar(){
  const groups = {};
  TOPICS.filter(t=>{
    if (levelFilter!=="all" && t.level!==levelFilter) return false;
    if (searchQuery && !(t.title.toLowerCase().includes(searchQuery)||t.intro.toLowerCase().includes(searchQuery))) return false;
    return true;
  }).forEach(t=>{
    groups[t.group] = groups[t.group] || [];
    groups[t.group].push(t);
  });
  const container = $("#nav-list");
  container.innerHTML = "";
  const home = el("div", {class:"nav-item"+(currentView.type==="home"?" active":""), onclick:()=>navigate({type:"home"})},
    el("div",{class:"nav-icon"},"🏠"), el("span",{},"Главная"));
  const debugItem = el("div", {class:"nav-item"+(currentView.type==="debug"?" active":""), onclick:()=>navigate({type:"debug"})},
    el("div",{class:"nav-icon"},"🐛"), el("span",{},"Debug Challenge"));
  const aiItem = el("div", {class:"nav-item"+(currentView.type==="ai"?" active":""), onclick:()=>navigate({type:"ai"})},
    el("div",{class:"nav-icon"},"🤖"), el("span",{},"AI Challenge"));
  const achItem = el("div", {class:"nav-item"+(currentView.type==="ach"?" active":""), onclick:()=>navigate({type:"ach"})},
    el("div",{class:"nav-icon"},"🏆"), el("span",{},"Достижения"));
  container.append(home, debugItem, aiItem, achItem);
  Object.entries(groups).forEach(([g, items])=>{
    container.appendChild(el("div",{class:"nav-section"}, g));
    items.forEach(t=>{
      const item = el("div", {
        class:"nav-item"+(currentView.type==="topic"&&currentView.id===t.id?" active":"")+(state.done["t"+t.id]?" done":""),
        onclick:()=>navigate({type:"topic", id:t.id})
      }, el("div",{class:"nav-icon"}, t.emoji), el("span",{}, t.title));
      container.appendChild(item);
    });
  });
}

function navigate(v){ currentView = v; render(); }

function render(){
  renderSidebar(); renderTop();
  const main = $("#main");
  main.innerHTML = "";
  main.classList.remove("fade-in"); void main.offsetWidth; main.classList.add("fade-in");
  if (currentView.type==="home") renderHome(main);
  else if (currentView.type==="topic") renderTopic(main, TOPICS.find(t=>t.id===currentView.id));
  else if (currentView.type==="debug") renderDebug(main);
  else if (currentView.type==="ai") renderAI(main);
  else if (currentView.type==="ach") renderAch(main);
}

function renderHome(main){
  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"},"🐍"),
      el("h1",{},"Добро пожаловать в Java Academy!"),
      el("p",{},"Интерактивная платформа для изучения Java. 40 тем, 600+ примеров, 30 debug-задач, AI-челлендж, викторины и достижения. Учись, играй, набирай XP!")
    )
  );
  const cards = el("div",{class:"cards"});
  TOPICS.forEach(t=>{
    const c = el("div",{class:"card"+(state.done["t"+t.id]?" done":""), onclick:()=>navigate({type:"topic",id:t.id})},
      el("div",{class:"emoji"}, t.emoji),
      el("h3",{}, t.title),
      el("div",{class:"meta"}, `${t.group} · `, el("span",{class:"level-"+(t.level==="easy"?"easy":t.level==="mid"?"mid":"hard")}, t.level==="easy"?"новичок":t.level==="mid"?"средний":"продвинутый"))
    );
    cards.appendChild(c);
  });
  if (state.profile){
    main.append(el("div",{class:"panel",style:"margin:18px 40px"},
      el("h3",{},"👤 Профиль ученика"),
      el("p",{}, "Имя: " + state.profile.fullName),
      el("p",{}, "Класс: " + state.profile.className),
      el("p",{class:"muted"}, "XP: " + state.xp + " · Изучено тем: " + Object.keys(state.done).filter(k=>k.startsWith("t")).length + "/" + TOPICS.length)
    ));
  }
  main.append(el("h2",{},"📚 Темы курса"), cards);
}

function renderTopic(main, topic){
  if (!topic) return;
  unlock("first");
  const doneCount = Object.keys(state.done).filter(k=>k.startsWith("t")).length;
  if (doneCount >= 5) unlock("five");
  if (doneCount >= 20) unlock("half");
  if (doneCount >= 40) unlock("all");

  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"}, topic.emoji),
      el("h1",{}, topic.title),
      el("p",{}, `Группа: ${topic.group} · Уровень: ${topic.level==="easy"?"новичок":topic.level==="mid"?"средний":"продвинутый"}`)
    )
  );
  const tabs = el("div",{class:"tabs"});
  const tabNames = [["intro","📖 Объяснение"],["examples","💻 Примеры (15)"],["tasks","✏️ Задания"],["quiz","🧠 Викторина"]];
  const contents = {};
  tabNames.forEach(([key,label])=>{
    const t = el("div",{class:"tab"+(key==="intro"?" active":""), onclick:()=>{
      tabs.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
      Object.values(contents).forEach(c=>c.style.display="none");
      contents[key].style.display="block";
    }}, label);
    tabs.appendChild(t);
  });
  main.appendChild(tabs);
  const wrap = el("div",{}); main.appendChild(wrap);

  contents.intro = el("div",{},
    el("div",{class:"panel"},
      el("h3",{},"Простое объяснение"),
      el("p",{}, topic.intro),
      el("h3",{},"Синтаксис"),
      codeBlock(topic.syntax),
      el("p",{class:"muted"}, "💡 " + topic.syntaxNote),
      el("button",{class:"btn-primary", onclick:()=>{
        if (!state.done["t"+topic.id]) addXP(20);
        markDone("t"+topic.id);
        toast("✅ Тема отмечена как изученная (+20 XP)");
      }},"Отметить как изученную")
    )
  );

  const examples = makeExamples(topic);
  contents.examples = el("div",{});
  examples.forEach((ex,i)=>{
    const out = el("div",{class:"run-out"}, "(нажмите «Показать вывод»)");
    const codeArea = el("textarea",{class:"editor"});
    codeArea.value = ex.code;
    const ex_el = el("div",{class:"example"},
      el("h3",{}, `#${i+1}. ${ex.title} `, el("span",{class:"badge level-"+(ex.level==="Новичок"?"easy":ex.level==="Средний"?"mid":"hard")}, ex.level)),
      el("p",{class:"muted"}, ex.explanation),
      codeArea,
      el("div",{class:"code-actions"},
        el("button",{class:"btn-primary",onclick:()=>{out.textContent = "▶ Ожидаемый вывод:\n" + ex.output;}},"▶ Показать вывод"),
        el("button",{class:"btn-ghost",onclick:()=>{navigator.clipboard.writeText(codeArea.value);toast("📋 Скопировано!")}},"📋 Копировать"),
        el("button",{class:"btn-ghost",onclick:()=>{codeArea.value=ex.code;out.textContent="(нажмите «Показать вывод»)"}},"🔄 Сброс"),
        el("button",{class:"btn-accent",onclick:()=>{out.textContent="✅ Эталонный вывод:\n"+ex.output}},"👁 Решение")
      ),
      out,
      el("p",{class:"muted",style:"margin-top:8px;font-size:12px"}, "💡 Java запускается интерпретатором — сохрани файл .java и запусти: python file.java")
    );
    contents.examples.appendChild(ex_el);
  });

  contents.tasks = el("div",{});
  makeTasks(topic).forEach((tk,i)=>{
    const sol = el("div",{class:"codebox",style:"display:none;margin-top:8px"}, el("pre",{html:highlight(tk.solution)}));
    const hint = el("p",{class:"muted",style:"display:none"}, "💡 " + tk.hint);
    contents.tasks.appendChild(
      el("div",{class:"panel"},
        el("h3",{}, `Задание ${i+1}`),
        el("p",{}, tk.q),
        el("div",{class:"code-actions"},
          el("button",{class:"btn-ghost",onclick:()=>hint.style.display=hint.style.display==="none"?"block":"none"},"💡 Подсказка"),
          el("button",{class:"btn-accent",onclick:()=>sol.style.display=sol.style.display==="none"?"block":"none"},"✅ Решение")
        ),
        hint, sol
      )
    );
  });

  const quiz = makeQuiz(topic);
  contents.quiz = el("div",{});
  let score = 0, answered = 0;
  const scoreEl = el("h3",{}, `Счёт: 0 / ${quiz.length}`);
  contents.quiz.appendChild(scoreEl);
  quiz.forEach((q,qi)=>{
    const opts = el("div",{class:"opts"});
    q.opts.forEach((opt,oi)=>{
      const o = el("div",{class:"opt", onclick:()=>{
        if (o.dataset.locked) return;
        opts.querySelectorAll(".opt").forEach(x=>x.dataset.locked="1");
        if (oi===q.answer){ o.classList.add("correct"); score++; }
        else { o.classList.add("wrong"); opts.children[q.answer].classList.add("correct"); }
        answered++;
        scoreEl.textContent = `Счёт: ${score} / ${quiz.length}`;
        if (answered===quiz.length){
          const isFirstCompletion = !state.quizDone["q"+topic.id];
          // Mark quizDone BEFORE calling addXP/notifyStateChange so the profile
          // card reads the updated quizDone count when it refreshes
          if (isFirstCompletion) {
            state.quizDone["q"+topic.id] = true;
            saveState();
            addXP(30); // internally calls notifyStateChange() -> profile updates with correct quizDone
            unlock("quiz");
            const quizCount = Object.keys(state.quizDone).length;
            if (quizCount >= 5) unlock("quiz5");
          } else {
            // Quiz already completed before — still refresh profile to stay in sync
            notifyStateChange();
          }
          toast(`Квиз пройден! ${score}/${quiz.length}`);
        }
      }}, opt);
      opts.appendChild(o);
    });
    contents.quiz.appendChild(el("div",{class:"quiz-q"}, el("strong",{},`${qi+1}. ${q.q}`), opts));
  });
  Object.entries(contents).forEach(([k,v])=>{ if (k!=="intro") v.style.display="none"; wrap.appendChild(v); });
}

function renderDebug(main){
  const bugs = window.__BUGS__ || (window.__BUGS__ = makeBugs());
  const doneN = Object.keys(state.debugDone).length;
  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"},"🐛"),
      el("h1",{},"Debug Challenge — Охота на ошибки"),
      el("p",{},`30 сломанных Java-программ (15 без ООП + 15 с ООП). В каждой минимум 10 ошибок. Найди и исправь их! Решено: ${doneN}/30`)
    )
  );
  bugs.forEach(b=>{
    const editor = el("textarea",{class:"editor",style:"min-height:260px"});
    editor.value = b.broken;
    const errList = el("ol",{style:"display:none"});
    b.errors.forEach(e=>errList.appendChild(el("li",{},e)));
    const fixedBox = el("div",{class:"codebox",style:"display:none;margin-top:8px"}, el("pre",{html:highlight(b.fixed)}));
    main.appendChild(el("div",{class:"panel"},
      el("h3",{}, `${b.title} `, el("span",{class:"badge level-"+(b.level==="Новичок"?"easy":b.level==="Средний"?"mid":"hard")}, b.level), " ", el("span",{class:"badge"}, b.oop?"🏛️ ООП":"📝 без ООП"), " ", el("span",{class:"badge"}, `найди ${b.errors.length}+ ошибок`)),
      editor,
      el("div",{class:"code-actions"},
        el("button",{class:"btn-ghost",onclick:()=>{
          errList.style.display = errList.style.display==="none"?"block":"none";
        }},"💡 Подсказки (список ошибок)"),
        el("button",{class:"btn-accent",onclick:()=>{
          fixedBox.style.display = fixedBox.style.display==="none"?"block":"none";
        }},"✅ Показать решение"),
        el("button",{class:"btn-primary",onclick:()=>{
          if (!state.debugDone[b.id]) { addXP(50); state.debugDone[b.id]=true; saveState();
            const n = Object.keys(state.debugDone).length;
            unlock("debug1"); if (n>=10) unlock("debug10");
            toast(`🐛 Программа решена! +50 XP (${n}/30)`);
            render();
          }
        }},"✔ Отметить решённой"+(state.debugDone[b.id]?" ✓":""))
      ),
      el("p",{class:"muted",style:"margin-top:8px"}, "Подсказки (нажми кнопку выше):"),
      errList,
      fixedBox
    ));
  });
}

function renderAI(main){
  const doneN = Object.keys(state.aiDone||{}).length;
  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"},"🤖"),
      el("h1",{},"AI Challenge — Творческие задачи с искусственным интеллектом"),
      el("p",{},`${AI_TASKS.length} креативных задач: используй любой AI-чат (ChatGPT, Claude, Lovable AI и т.д.), чтобы их выполнить. Решено: ${doneN}/${AI_TASKS.length}`)
    )
  );
  AI_TASKS.forEach(t=>{
    const hint = el("p",{class:"muted",style:"display:none;margin-top:8px"}, "💡 " + t.hint);
    main.appendChild(el("div",{class:"panel"},
      el("h3",{}, t.title, " ",
        el("span",{class:"badge level-"+(t.level==="easy"?"easy":t.level==="mid"?"mid":"hard")}, t.level==="easy"?"новичок":t.level==="mid"?"средний":"продвинутый")
      ),
      el("p",{}, t.desc),
      el("div",{class:"code-actions"},
        el("button",{class:"btn-ghost",onclick:()=>hint.style.display=hint.style.display==="none"?"block":"none"},"💡 Подсказка / промт"),
        el("button",{class:"btn-primary",onclick:()=>{
          state.aiDone = state.aiDone || {};
          if (!state.aiDone[t.id]) { state.aiDone[t.id]=true; addXP(40); saveState();
            toast(`🤖 Задача выполнена! +40 XP`);
            render();
          }
        }},"✔ Отметить выполненной"+((state.aiDone||{})[t.id]?" ✓":""))
      ),
      hint
    ));
  });
}

function renderAch(main){
  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"},"🏆"),
      el("h1",{},"Достижения"),
      el("p",{},`Открыто: ${Object.keys(state.achievements).length} / ${ACHIEVEMENTS.length}`)
    )
  );
  const wrap = el("div",{class:"achievements"});
  ACHIEVEMENTS.forEach(a=>{
    wrap.appendChild(el("div",{class:"ach"+(state.achievements[a.id]?" unlocked":"")},
      el("div",{}, el("strong",{},a.name)),
      el("div",{class:"muted"}, a.desc)
    ));
  });
  main.appendChild(wrap);
}

function codeBlock(code){
  const box = el("div",{class:"codebox"},
    el("pre",{html: highlight(code)})
  );
  const btn = el("button",{class:"btn-ghost",style:"margin-top:8px",onclick:()=>{navigator.clipboard.writeText(code);toast("📋 Скопировано!");}},"📋 Копировать");
  return el("div",{}, box, btn);
}

window.addEventListener("DOMContentLoaded", ()=>{
  const _initTheme = state.theme || "light";
  document.documentElement.className = _initTheme === "light" ? "light" : "";
  document.documentElement.setAttribute("data-theme", _initTheme);
  $("#search").addEventListener("input", e=>{ searchQuery = e.target.value.toLowerCase(); renderSidebar(); });
  document.querySelectorAll(".chip").forEach(c=>{
    c.addEventListener("click", ()=>{
      document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
      c.classList.add("active"); levelFilter = c.dataset.level; renderSidebar();
    });
  });
  $("#theme-toggle").addEventListener("click", ()=>{
    state.theme = state.theme==="light" ? "dark":"light"; saveState();
    document.documentElement.className = state.theme==="light"?"light":"";
    document.documentElement.setAttribute("data-theme", state.theme);
  });
  $("#reset").addEventListener("click", ()=>{
    if (confirm("Сбросить весь прогресс?")) {
      localStorage.removeItem(STATE_KEY); location.reload();
    }
  });
  const _eb = document.getElementById("edit-profile");
  if (_eb) _eb.addEventListener("click", ()=>showProfileModal(true));
  if (!state.profile) showProfileModal(false); else updateProfileBadge();
  render();
});

function updateProfileBadge(){
  const b = document.getElementById("profile-badge");
  if (!b) return;
  if (state.profile) b.textContent = "👤 " + state.profile.fullName + " · " + state.profile.className;
  else b.textContent = "👤 Гость";
}
function showProfileModal(canCancel){
  const back = el("div",{class:"modal-back"});
  const nameI = el("input",{class:"search",style:"margin:8px 0",placeholder:"Имя и фамилия"});
  const classI = el("input",{class:"search",style:"margin:8px 0",placeholder:"Класс (например, 6А)"});
  if (state.profile){ nameI.value = state.profile.fullName||""; classI.value = state.profile.className||""; }
  const err = el("div",{class:"muted",style:"color:#e25;font-size:12px;min-height:16px"});
  const save = el("button",{class:"btn-primary",style:"margin-right:8px",onclick:()=>{
    const n = nameI.value.trim(), c = classI.value.trim();
    if (n.length<2 || c.length<1){ err.textContent="Заполни оба поля"; return; }
    state.profile = {fullName:n, className:c}; saveState();
    updateProfileBadge(); back.remove(); render();
  }},"Сохранить");
  const cancel = canCancel ? el("button",{class:"btn-ghost",onclick:()=>back.remove()},"Отмена") : document.createTextNode("");
  const box = el("div",{class:"modal"},
    el("h3",{},"👤 Профиль ученика"),
    el("p",{class:"muted"},"Введи имя и класс — прогресс сохранится вместе с профилем."),
    nameI, classI, err,
    el("div",{style:"margin-top:8px"}, save, cancel)
  );
  back.appendChild(box);
  document.body.appendChild(back);
  setTimeout(()=>nameI.focus(),50);
}
