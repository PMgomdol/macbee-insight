// 맥비 자료실 드라이브 저장 — 실제 동작은 MacbeDrive 라이브러리에 있습니다.
function doGet() { return MacbeDrive.doGet(); }
function doPost(e) { return MacbeDrive.doPost(e); }
function testDriveWebapp() { Logger.log(MacbeDrive.setup()); }
